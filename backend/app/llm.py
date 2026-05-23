"""Anthropic Claude wrapper.

Two entry points:
  - `extract_resume(filename, data)` — uses a forced tool call to extract a
    structured resume from a PDF or text upload. Claude reads PDFs natively
    as `document` content blocks, no third-party parser needed.
  - `tool_calling_loop(...)` — multi-turn tool-calling loop for the chat
    agent. Surfaces every tool invocation to a callback so the UI can render
    a reasoning trace.

Prompt caching
--------------
Cache breakpoints are placed on the system prompt and the trailing tool
declaration. Within a session, these are reused across every chat turn —
cutting cost ~3× on the input side and trimming latency a bit too.
"""

from __future__ import annotations

import base64
import io
import json
import logging
from collections.abc import Callable
from typing import Any

from anthropic import Anthropic
from pypdf import PdfReader

from .config import get_settings
from .schemas import (
    InterviewQuestion,
    JdMatchResult,
    ResumeData,
    SkillScore,
)

logger = logging.getLogger(__name__)

MAX_TOOL_LOOPS = 6
MAX_TOKENS = 3072       # chat replies — generous so JSON + _suggestions never truncate
EXTRACT_MAX_TOKENS = 4096

# Module-level cached client — keeps the underlying httpx pool alive.
_CLIENT: Anthropic | None = None


def _client() -> Anthropic:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = Anthropic(api_key=get_settings().anthropic_api_key)
    return _CLIENT


def _model() -> str:
    return get_settings().anthropic_model


# ---------------------------------------------------------------------------
# Resume extraction — forced tool call returns structured JSON directly.
# ---------------------------------------------------------------------------

_EXTRACTION_SYSTEM = """\
You are reading a candidate's resume for a hiring manager. Submit your read
via the `submit_resume_structure` tool.

Rules:
- Do NOT invent or embellish facts. If a field is not in the resume, leave
  it null or empty.
- Never use emojis in any field — keep all text plain and professional.

Skills — group into named categories:
- Bucket atomic skill tokens (languages, frameworks, libraries, tools, infra)
  into logical groups: "Frontend", "Backend", "AI / ML", "Databases",
  "DevOps & Cloud", "Languages", "Soft Skills", "Other" — use the categories
  that fit; create new ones only when needed.
- Each category is { name: "...", items: ["...", "..."] }. Do not duplicate
  a skill across categories. Skip categories that would be empty.

Projects — extract a separate `projects` list:
- Each project: name, short description, technologies used, optional date,
  optional URL.
- If the resume mentions project work *inside* an experience entry, also
  surface it as a top-level project so it gets its own card.

Achievements — extract honors, awards, certifications, hackathons, recognitions:
- Each: title, optional description, optional date.

Education:
- Include `score` whenever the resume mentions GPA / CGPA / percentage /
  class rank / honors. Use the candidate's verbatim form (e.g. "8.6 CGPA",
  "First Class with Distinction", "3.7 / 4.0").

Links — extract URLs/handles for GitHub, LinkedIn, portfolio, etc. ALWAYS
include the full URL with scheme (e.g. "https://github.com/janedev",
"https://linkedin.com/in/janedev"). If the resume omits the scheme, add
"https://" yourself.

Strengths and gaps (surfaced in a dedicated UI tool, not the dossier):
- `strengths`: 3–5 specific, evidence-anchored positives — e.g. "Owns
  systems end-to-end (led ledger migration that cut p95 by 40%)".
- `gaps`: 3–5 honest, non-judgmental observations about what's missing or
  thin — e.g. "No mention of testing frameworks or CI/CD".
- Both lists must be grounded in the resume content.

Suggested questions:
- `suggested_questions`: 4 opening questions the RECRUITER (the user of this
  app) would type into the chat to learn more about this candidate.
  - USE THIRD-PERSON about the candidate, addressed to the AI assistant.
    Examples (correct): "How many years of backend experience does the
    candidate have?", "Has the candidate shipped production AI work?",
    "What's the strongest signal in this resume?".
  - DO NOT write interview questions directed at the candidate.
    Wrong: "Tell us about your backend experience.", "Can you walk us
    through the Silvo project?". Those are interview prompts, not chat
    queries to an assistant.
  - Tailor to specifics from the resume (companies, technologies, themes)."""

_EXTRACTION_TOOL: dict = {
    "name": "submit_resume_structure",
    "description": "Submit the structured read of the candidate's resume.",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": ["string", "null"]},
            "email": {"type": ["string", "null"]},
            "phone": {"type": ["string", "null"]},
            "summary": {"type": ["string", "null"]},
            "skills": {
                "type": "array",
                "description": "Skills grouped into named categories.",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "items": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["name", "items"],
                },
            },
            "experience": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string"},
                        "company": {"type": "string"},
                        "start": {"type": ["string", "null"]},
                        "end": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                    },
                    "required": ["role", "company"],
                },
            },
            "education": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "degree": {"type": "string"},
                        "institution": {"type": "string"},
                        "year": {"type": ["string", "null"]},
                        "score": {
                            "type": ["string", "null"],
                            "description": "GPA, CGPA, percentage, class rank, or other achievement marker.",
                        },
                    },
                    "required": ["degree", "institution"],
                },
            },
            "projects": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": ["string", "null"]},
                        "technologies": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "date": {"type": ["string", "null"]},
                        "url": {"type": ["string", "null"]},
                    },
                    "required": ["name"],
                },
            },
            "achievements": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": ["string", "null"]},
                        "date": {"type": ["string", "null"]},
                    },
                    "required": ["title"],
                },
            },
            "links": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string"},
                        "url": {
                            "type": "string",
                            "description": "Full URL with scheme — e.g. 'https://github.com/janedev'.",
                        },
                    },
                    "required": ["label", "url"],
                },
            },
            "strengths": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 evidence-anchored positives drawn from the resume.",
            },
            "gaps": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 honest, non-judgmental observations about what's missing or thin.",
            },
            "suggested_questions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "4 specific, resume-tailored questions a recruiter might open with.",
            },
        },
        "required": [
            "skills",
            "experience",
            "education",
            "projects",
            "achievements",
            "links",
            "strengths",
            "gaps",
            "suggested_questions",
        ],
    },
}


def _extract_raw_text(filename: str, data: bytes) -> str:
    """Extract plain text from the uploaded file LOCALLY (not via Claude).
    Used to populate ResumeData.raw_text for the search tool, without paying
    the LLM ~1500 output tokens to regurgitate text it already read."""
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix == "pdf":
        try:
            reader = PdfReader(io.BytesIO(data))
            return "\n\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            logger.warning("Local PDF text extraction failed; raw_text will be empty.")
            return ""
    return data.decode("utf-8", errors="replace")


def extract_resume(filename: str, data: bytes) -> ResumeData:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if suffix == "pdf":
        document_block = {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": base64.standard_b64encode(data).decode("ascii"),
            },
        }
        user_content = [
            document_block,
            {"type": "text", "text": "Extract and submit this resume."},
        ]
    else:
        text = data.decode("utf-8", errors="replace")
        user_content = [
            {"type": "text", "text": f"Resume text:\n\n{text}"},
            {"type": "text", "text": "Extract and submit this resume."},
        ]

    response = _client().messages.create(
        model=_model(),
        max_tokens=EXTRACT_MAX_TOKENS,
        system=_EXTRACTION_SYSTEM,
        messages=[{"role": "user", "content": user_content}],
        tools=[_EXTRACTION_TOOL],
        tool_choice={"type": "tool", "name": "submit_resume_structure"},
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "submit_resume_structure":
            payload = dict(block.input) if isinstance(block.input, dict) else {}
            # Populate raw_text locally so Claude doesn't have to regurgitate
            # the whole document back to us — that's the slowest part of the
            # extraction call (output tokens are sequential).
            payload["raw_text"] = _extract_raw_text(filename, data)
            return ResumeData.model_validate(payload)

    raise RuntimeError(
        "Claude did not return the forced tool call during resume extraction."
    )


# ---------------------------------------------------------------------------
# Skill scoring — one-shot, forced tool call, score each given skill 0-10.
# ---------------------------------------------------------------------------

_SCORING_SYSTEM = """\
You score how well a candidate demonstrates specific skills based only on
their resume. Be honest and conservative.

Rules:
- Never use emojis. Keep reasoning plain and professional.
- Score each given skill on a 0–10 integer scale.
  - 9–10: Mastery — multiple roles, deep evidence, leadership in this area.
  - 7–8 : Strong working knowledge — clear hands-on, recent, substantial use.
  - 5–6 : Solid competence — listed and used, but not deeply demonstrated.
  - 3–4 : Familiarity — mentioned briefly, light or older usage.
  - 1–2 : Tangential — only adjacent or implied evidence.
  - 0   : No evidence at all in the resume.
- Provide a one-sentence `reasoning` citing what in the resume supports the
  score (or noting the absence). Keep it under ~120 characters.
- Match each input skill EXACTLY (preserve casing). Return scores in the
  same order as the input.
- Never invent skills not in the input list."""

_SCORING_TOOL: dict = {
    "name": "submit_skill_scores",
    "description": "Submit per-skill scores for the requested skills.",
    "input_schema": {
        "type": "object",
        "properties": {
            "scores": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "skill": {"type": "string"},
                        "score": {"type": "integer", "minimum": 0, "maximum": 10},
                        "reasoning": {"type": "string"},
                    },
                    "required": ["skill", "score", "reasoning"],
                },
            }
        },
        "required": ["scores"],
    },
}


def score_skills(resume: ResumeData, skills: list[str]) -> list[SkillScore]:
    if not skills:
        return []

    skills_block = "\n".join(f"- {s}" for s in skills)
    user_prompt = (
        "Score this candidate on the following skills, based only on the "
        "resume below. Return one score per skill in the same order.\n\n"
        f"SKILLS TO SCORE:\n{skills_block}\n\n"
        f"RESUME:\n{resume.raw_text}"
    )

    client = _client()
    response = client.messages.create(
        model=_model(),
        max_tokens=EXTRACT_MAX_TOKENS,
        system=_SCORING_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[_SCORING_TOOL],
        tool_choice={"type": "tool", "name": "submit_skill_scores"},
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "submit_skill_scores":
            raw = block.input.get("scores", []) if isinstance(block.input, dict) else []
            return [SkillScore.model_validate(item) for item in raw]

    raise RuntimeError("Claude did not return the forced tool call for skill scoring.")


# ---------------------------------------------------------------------------
# JD Match — one-shot, forced tool call, fit summary against a job description.
# ---------------------------------------------------------------------------

_JD_MATCH_SYSTEM = """\
You evaluate how well a candidate's resume fits a specific job description.
Be honest and grounded. Cite resume content; never invent.

Rules:
- Never use emojis. Keep all text plain and professional.
- `overall_fit`: 0–100 integer.
  - 85+ : exceptional, role-aligned across requirements and seniority
  - 65–84 : strong fit with one or two gaps
  - 45–64 : partial fit; meaningful concerns
  - 25–44 : weak fit; significant gaps
  - 0–24 : not a fit
- `matched_skills`: required skills from the JD that ARE evidenced in the
  resume. Use the candidate's wording.
- `missing_skills`: required skills NOT in the resume.
- `key_strengths` (3–5): what makes the candidate compelling FOR THIS ROLE
  specifically (anchored in resume content).
- `key_concerns` (2–5): gaps, risks, or seniority/experience mismatches
  specific to this role. Honest, non-judgmental.
- `experience_assessment`: one paragraph on whether their years and role
  history meet the requirements.
- `fit_summary`: one short paragraph for the recruiter to skim."""

_JD_MATCH_TOOL: dict = {
    "name": "submit_jd_match",
    "description": "Submit the candidate-vs-JD fit analysis.",
    "input_schema": {
        "type": "object",
        "properties": {
            "overall_fit": {"type": "integer", "minimum": 0, "maximum": 100},
            "fit_summary": {"type": "string"},
            "matched_skills": {"type": "array", "items": {"type": "string"}},
            "missing_skills": {"type": "array", "items": {"type": "string"}},
            "experience_assessment": {"type": "string"},
            "key_strengths": {"type": "array", "items": {"type": "string"}},
            "key_concerns": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "overall_fit",
            "fit_summary",
            "matched_skills",
            "missing_skills",
            "experience_assessment",
            "key_strengths",
            "key_concerns",
        ],
    },
}


def analyze_jd_match(resume: ResumeData, job_description: str) -> JdMatchResult:
    user_prompt = (
        "Analyze how well the candidate (resume below) fits the role (JD below). "
        "Submit your read via the tool.\n\n"
        "=== JOB DESCRIPTION ===\n"
        f"{job_description}\n\n"
        "=== RESUME ===\n"
        f"{resume.raw_text}"
    )

    client = _client()
    response = client.messages.create(
        model=_model(),
        max_tokens=EXTRACT_MAX_TOKENS,
        system=_JD_MATCH_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[_JD_MATCH_TOOL],
        tool_choice={"type": "tool", "name": "submit_jd_match"},
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "submit_jd_match":
            return JdMatchResult.model_validate(block.input)

    raise RuntimeError("Claude did not return the forced tool call for JD match.")


# ---------------------------------------------------------------------------
# Interview Questions — generate targeted probes anchored to the resume.
# ---------------------------------------------------------------------------

_INTERVIEW_SYSTEM = """\
You generate targeted interview questions for a hiring manager to ask THIS
specific candidate, anchored in details from their resume.

Rules:
- Never use emojis. Keep all text plain and professional.
- Reference specific companies, roles, technologies, or projects from the
  resume by NAME when relevant. Don't write generic prompts.
- Each question must be one a hiring manager would actually ask a candidate
  (so directed AT the candidate, second-person, e.g. "Walk me through your
  ledger migration at Quarry — what was the hardest part?").
- For each question, also give:
    - `rationale`: one short sentence on WHY (which resume detail it probes
      and what signal you're going for).
    - `listen_for`: one short sentence describing what a strong answer
      includes (e.g. "Concrete metrics, ownership of the call, what they'd
      do differently.").
- Generate 5–7 questions, varied across behavioural, technical, and
  motivation. Hard at least 2 of them; easy 1.
- Tightly tied to the user's `focus` — if focus is "Python", every question
  should probe Python competence as evidenced in the resume. If focus is
  vague, infer from the resume's strongest theme."""

_INTERVIEW_TOOL: dict = {
    "name": "submit_interview_questions",
    "description": "Submit targeted interview questions for the candidate.",
    "input_schema": {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "rationale": {"type": "string"},
                        "listen_for": {"type": "string"},
                    },
                    "required": ["question", "rationale", "listen_for"],
                },
            }
        },
        "required": ["questions"],
    },
}


def generate_interview_questions(
    resume: ResumeData, focus: str
) -> list[InterviewQuestion]:
    focus_clean = focus.strip() or "the candidate's strongest area"
    user_prompt = (
        f"Generate interview questions focused on: {focus_clean}\n\n"
        "Anchor every question in details from this candidate's resume.\n\n"
        "=== RESUME ===\n"
        f"{resume.raw_text}"
    )

    client = _client()
    response = client.messages.create(
        model=_model(),
        max_tokens=EXTRACT_MAX_TOKENS,
        system=_INTERVIEW_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[_INTERVIEW_TOOL],
        tool_choice={"type": "tool", "name": "submit_interview_questions"},
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "submit_interview_questions":
            raw = block.input.get("questions", []) if isinstance(block.input, dict) else []
            return [InterviewQuestion.model_validate(item) for item in raw]

    raise RuntimeError(
        "Claude did not return the forced tool call for interview questions."
    )


# ---------------------------------------------------------------------------
# Tool-calling loop for the chat agent.
# ---------------------------------------------------------------------------


def tool_calling_loop(
    *,
    system_instruction: str,
    conversation: list[dict],
    tool_declarations: list[dict],
    tool_executor: Callable[[str, dict], Any],
    on_tool_call: Callable[[str, dict, Any], None] | None = None,
) -> str:
    """Run a multi-turn tool-calling loop. Returns Claude's final assistant text."""

    client = _client()

    # System prompt + cache marker → cached across every turn in the session.
    system_blocks = [
        {
            "type": "text",
            "text": system_instruction,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    # Tool declarations — cache marker on the last tool caches the whole list.
    tools = [dict(t) for t in tool_declarations]
    if tools:
        tools[-1] = {**tools[-1], "cache_control": {"type": "ephemeral"}}

    # Build messages. The very first user turn (resume grounding) gets its own
    # cache mark so a long preamble doesn't pay tokens every turn.
    messages: list[dict] = []
    for i, turn in enumerate(conversation):
        role = "user" if turn["role"] == "user" else "assistant"
        content: list[dict] | str
        if i == 0 and role == "user":
            content = [
                {
                    "type": "text",
                    "text": turn["content"],
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        else:
            content = turn["content"]
        messages.append({"role": role, "content": content})

    for _ in range(MAX_TOOL_LOOPS):
        response = client.messages.create(
            model=_model(),
            max_tokens=MAX_TOKENS,
            system=system_blocks,
            messages=messages,
            tools=tools,
        )

        if response.stop_reason == "tool_use":
            # Mirror the assistant's tool-use turn into messages so the next
            # call sees it in context.
            messages.append({"role": "assistant", "content": response.content})

            tool_results: list[dict] = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                args = dict(block.input or {})
                try:
                    result = tool_executor(block.name, args)
                except Exception as exc:
                    logger.exception("Tool %s raised", block.name)
                    result = {"error": str(exc)}
                if on_tool_call is not None:
                    on_tool_call(block.name, args, result)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, default=str),
                    }
                )
            messages.append({"role": "user", "content": tool_results})
            continue

        # stop_reason == "end_turn" (or similar) — collect text and return.
        text = "".join(
            block.text for block in response.content if block.type == "text"
        )
        if text.strip():
            return text.strip()
        break

    raise RuntimeError(f"Tool-calling loop exceeded {MAX_TOOL_LOOPS} iterations.")
