"""The chat agent: system prompt, deterministic tools, orchestration loop,
and structured-output validation — all in one place.

Design notes
------------
- The 3 tools are pure functions: skill matching, experience calculation,
  resume keyword search. They are how we avoid hallucination — anytime a
  question turns on a specific fact, the model is expected to route through
  a tool rather than guess.
- The final answer is validated against the mandated `StructuredAnswer`
  schema. One repair retry on validation failure, then a safe fallback.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Any

from pydantic import ValidationError

from . import llm
from .memory import ChatTurn, Session
from .schemas import ChatResponse, StructuredAnswer, ToolCall

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# System prompt — every guardrail the assignment asks for, in natural language,
# then re-enforced by code via Pydantic validation of the final JSON.
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are an Intelligent Resume Assistant — a hiring-side AI that helps a
recruiter evaluate ONE candidate's resume.

# Role
Only discuss the uploaded resume and questions a hiring manager would ask
about it (skills, fit, experience, education, summary, comparison to a JD).
For off-topic questions, refuse politely with source="inference",
confidence=1.0.

# Tools (call them whenever the answer turns on a verifiable fact)
- match_skills(required_skills) — deterministic skill match against the resume.
  Use for "does the candidate have X, Y, Z" and JD-vs-resume questions.
- calculate_experience() — deterministic total years of experience.
  Use for seniority / years questions.
- search_resume(query) — substring search over the raw resume text.
  Use to confirm a term is actually present before asserting it.

Answer directly (no tool) only for: summarization of context already loaded,
clearly off-topic refusals, or follow-ups whose facts are in the conversation.

# Guardrails — non-negotiable
1. NEVER fabricate. If the resume doesn't say it, say so and list the gap in
   `missing_data`.
2. NEVER invent skills, years, companies, or degrees. If guessing,
   source="inference" and confidence ≤ 0.6.
3. NEVER be vague. Quantify or say it's not in the resume.
4. Prefer source="resume" with a quote/paraphrase over source="inference".

# Output contract — MANDATORY
Your final reply (after any tool calls) must be a single JSON object, no
prose, no fences. Include an extra `_suggestions` field with 3 short
follow-up questions tied to what you just answered.

{
  "answer": string,
  "confidence": number,            // 0.0–1.0
  "source": "resume" | "inference",
  "missing_data": string[],
  "_suggestions": string[]         // 3 follow-ups the recruiter would type next
}

CRITICAL — `_suggestions` rules:
- These are questions the RECRUITER (user of this app) will type INTO the
  chat to ask YOU next. They are NOT interview questions to ask the
  candidate.
- USE THIRD-PERSON about the candidate. Examples of CORRECT phrasing:
  "How recent is the candidate's Python work?",
  "Did the candidate lead any migrations?",
  "What's the strongest signal of seniority?".
- WRONG (these are interview prompts, not chat queries — never produce these):
  "Tell us about your backend experience.",
  "Can you walk us through the Silvo project?",
  "What was your biggest technical challenge?".
- Tie tightly to the topic of your last answer (don't change subject).
- Each under ~70 characters.

# Formatting (inside `answer`)
You may use light Markdown inside `answer` — **bold**, *italics*, bullet
lists, inline `code`. Don't write headings. **Never use emojis** in any
field — keep replies plain and professional.

# NEVER write lazy / placeholder text
- NEVER write "...above...", "(see above)", "as mentioned earlier", "...etc...",
  "[truncated]", or any other placeholder that omits content. Always write
  the complete answer, restating any needed details.
- NEVER reference your own previous replies as a substitute for answering.
  If a question relates to an earlier answer, repeat the relevant facts
  in full.

# Confidence guide
- 0.9–1.0: direct quote / explicit fact from the resume
- 0.7–0.9: derived from explicit facts (e.g. calculated YoE)
- 0.4–0.7: reasonable inference from partial data
- 0.0–0.4: speculation — usually refuse instead

Be concise. Lead with the answer."""


_FALLBACK_ANSWER = StructuredAnswer(
    answer=(
        "I had trouble producing a structured answer for that. Could you "
        "rephrase as a hiring-related question about the resume?"
    ),
    confidence=0.0,
    source="inference",
    missing_data=[],
)


# ---------------------------------------------------------------------------
# Deterministic tools
# ---------------------------------------------------------------------------


def match_skills(required: list[str], candidate: list[str]) -> dict:
    def norm(s: str) -> str:
        return re.sub(r"[^a-z0-9+#.]", "", s.lower())

    cand_index = {norm(s): s for s in candidate if s.strip()}
    matched, missing = [], []
    for req in required:
        if not req.strip():
            continue
        key = norm(req)
        if key in cand_index:
            matched.append(cand_index[key])
            continue
        # substring fallback for cases like "react.js" vs "react"
        hit = next((orig for nk, orig in cand_index.items() if key and (key in nk or nk in key)), None)
        if hit:
            matched.append(hit)
        else:
            missing.append(req)

    total = len(matched) + len(missing)
    return {
        "matched": matched,
        "missing": missing,
        "coverage_ratio": round(len(matched) / total, 2) if total else 0.0,
        "summary": f"{len(matched)}/{total} required skills present" if total else "No required skills provided.",
    }


_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _parse_date(value: str | None, *, end: bool = False) -> datetime | None:
    if value is None:
        return datetime.now() if end else None
    v = value.strip().lower()
    if not v:
        return datetime.now() if end else None
    if v in {"present", "current", "now", "ongoing"}:
        return datetime.now()

    if m := re.match(r"^(\d{4})[-/](\d{1,2})", v):
        return datetime(int(m.group(1)), int(m.group(2)), 1)
    if m := re.match(r"^([a-z]+)[\s,/-]+(\d{4})$", v):
        token = m.group(1)
        key = token[:4] if token[:4] in _MONTHS else token[:3]
        if key in _MONTHS:
            return datetime(int(m.group(2)), _MONTHS[key], 1)
    if m := re.match(r"^(\d{4})$", v):
        return datetime(int(m.group(1)), 6, 1)
    return None


def calculate_experience(entries: list[dict]) -> dict:
    intervals: list[tuple[datetime, datetime]] = []
    per_role: list[dict] = []
    for entry in entries:
        start = _parse_date(entry.get("start"))
        end = _parse_date(entry.get("end"), end=True)
        label = f"{entry.get('role', '?')} @ {entry.get('company', '?')}"
        if start is None or end is None or end < start:
            per_role.append({"role": label, "months": None, "note": "unparseable dates"})
            continue
        months = (end.year - start.year) * 12 + (end.month - start.month)
        intervals.append((start, end))
        per_role.append({"role": label, "months": months})

    intervals.sort()
    merged: list[tuple[datetime, datetime]] = []
    for s, e in intervals:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    total_months = sum((e.year - s.year) * 12 + (e.month - s.month) for s, e in merged)
    return {
        "total_years": round(total_months / 12, 1),
        "total_months": total_months,
        "per_role": per_role,
        "note": "Overlapping roles merged so concurrent positions aren't double-counted.",
    }


def search_resume(query: str, resume_text: str, max_snippets: int = 4) -> dict:
    if not query.strip():
        return {"snippets": [], "found": False, "match_count": 0}
    needle = query.strip().lower()
    lines = resume_text.splitlines()
    snippets: list[dict] = []
    for idx, line in enumerate(lines):
        if needle in line.lower():
            window = "\n".join(lines[max(0, idx - 1): min(len(lines), idx + 2)]).strip()
            snippets.append({"line_number": idx + 1, "snippet": window})
            if len(snippets) >= max_snippets:
                break
    return {
        "snippets": snippets,
        "found": bool(snippets),
        "match_count": sum(1 for ln in lines if needle in ln.lower()),
    }


# ---------------------------------------------------------------------------
# Tool declarations sent to Gemini
# ---------------------------------------------------------------------------

TOOL_DECLARATIONS: list[dict] = [
    {
        "name": "match_skills",
        "description": (
            "Deterministically match a list of required skills against the "
            "candidate's skills from the resume. Returns matched, missing, "
            "and coverage ratio."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "required_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Skills required by the role.",
                }
            },
            "required": ["required_skills"],
        },
    },
    {
        "name": "calculate_experience",
        "description": (
            "Deterministically compute the candidate's total years of "
            "professional experience from their dated roles."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "search_resume",
        "description": (
            "Case-insensitive substring search over the raw resume text. "
            "Returns matching snippets with line numbers."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Term or phrase to look up.",
                }
            },
            "required": ["query"],
        },
    },
]


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def _flatten_skills(session: Session) -> list[str]:
    return [item for cat in session.resume.skills for item in cat.items]


def _resume_grounding(session: Session) -> str:
    r = session.resume
    skills_lines = "\n".join(
        f"  - {cat.name}: {', '.join(cat.items)}" for cat in r.skills if cat.items
    ) or "  (none)"
    exp = "\n".join(
        f"  - {e.role} @ {e.company} ({e.start or '?'} → {e.end or '?'})"
        + (f": {e.description}" if e.description else "")
        for e in r.experience
    ) or "  (none)"
    edu = "\n".join(
        f"  - {e.degree}, {e.institution}"
        + (f" ({e.year})" if e.year else "")
        + (f" — {e.score}" if e.score else "")
        for e in r.education
    ) or "  (none)"
    projects = "\n".join(
        f"  - {p.name}" + (f": {p.description}" if p.description else "")
        + (f" [tech: {', '.join(p.technologies)}]" if p.technologies else "")
        for p in r.projects
    ) or "  (none)"
    achievements = "\n".join(
        f"  - {a.title}" + (f": {a.description}" if a.description else "")
        for a in r.achievements
    ) or "  (none)"
    return (
        "CONTEXT — Loaded resume:\n"
        f"Name: {r.name or 'Not mentioned in resume'}\n"
        f"Skills (grouped):\n{skills_lines}\n"
        f"Experience:\n{exp}\n"
        f"Education:\n{edu}\n"
        f"Projects:\n{projects}\n"
        f"Achievements:\n{achievements}\n"
        + (f"Summary: {r.summary}\n" if r.summary else "")
        + "Raw text is available via the search_resume tool.\n"
        "Acknowledge by waiting for the user's question."
    )


_JSON_BLOCK_RE = re.compile(r"\{[\s\S]*\}")

_SPEC_FIELDS = {"answer", "confidence", "source", "missing_data"}

# Patterns that indicate the model dodged the actual content with a stub.
# If any of these show up in `answer`, we treat the reply as invalid and
# trigger the repair retry.
_PLACEHOLDER_PATTERNS = [
    re.compile(r"\.{3,}\s*\(?\s*above\s*\)?\s*\.{0,3}", re.IGNORECASE),
    re.compile(r"\bsee above\b", re.IGNORECASE),
    re.compile(r"\bas (mentioned|stated|noted) (above|earlier)\b", re.IGNORECASE),
    re.compile(r"\[(truncated|placeholder|omitted)\]", re.IGNORECASE),
]


def _looks_placeholder(answer: str) -> bool:
    return any(p.search(answer) for p in _PLACEHOLDER_PATTERNS)


def _coerce(text: str) -> tuple[StructuredAnswer, list[str]]:
    """Parse the model output, validate the spec fields strictly, and pluck
    `_suggestions` separately so the spec contract stays clean."""
    body = text.strip().lstrip("`")
    if body.lower().startswith("json"):
        body = body[4:].lstrip()
    match = _JSON_BLOCK_RE.search(body)
    if not match:
        raise ValueError(f"No JSON object in model output: {text[:300]}")
    payload = json.loads(match.group(0))
    spec = {k: payload[k] for k in _SPEC_FIELDS if k in payload}
    suggestions = payload.get("_suggestions") or []
    if not isinstance(suggestions, list):
        suggestions = []
    structured = StructuredAnswer.model_validate(spec)
    if _looks_placeholder(structured.answer):
        raise ValueError(
            "Answer contains placeholder text (e.g. '...above...') — refusing."
        )
    return structured, [str(s) for s in suggestions]


def run_agent(session: Session, user_message: str) -> ChatResponse:
    session.last_intent = user_message[:200]

    conversation: list[dict] = [
        {"role": "user", "content": _resume_grounding(session)},
        {"role": "assistant", "content": "Ready. What would you like to know?"},
    ]
    for turn in session.history:
        conversation.append({"role": turn.role, "content": turn.content})
    conversation.append({"role": "user", "content": user_message})

    logger.info(
        "Chat turn — session=%s prior_turns=%d sending_total=%d chars=%d",
        session.id[:8],
        len(session.history),
        len(conversation),
        sum(len(t["content"]) for t in conversation),
    )

    trace: list[ToolCall] = []

    def on_tool(name: str, args: dict, result: Any) -> None:
        preview = json.dumps(result, default=str)
        trace.append(ToolCall(
            name=name,
            arguments=args,
            result_preview=preview if len(preview) <= 240 else preview[:237] + "...",
        ))

    def executor(name: str, args: dict) -> Any:
        if name == "match_skills":
            return match_skills(
                args.get("required_skills") or [],
                _flatten_skills(session),
            )
        if name == "calculate_experience":
            return calculate_experience([e.model_dump() for e in session.resume.experience])
        if name == "search_resume":
            return search_resume(args.get("query") or "", session.resume.raw_text)
        return {"error": f"Unknown tool: {name}"}

    try:
        final = llm.tool_calling_loop(
            system_instruction=SYSTEM_PROMPT,
            conversation=conversation,
            tool_declarations=TOOL_DECLARATIONS,
            tool_executor=executor,
            on_tool_call=on_tool,
        )
    except Exception as exc:
        logger.exception("Agent loop failed")
        return ChatResponse(
            session_id=session.id,
            structured=StructuredAnswer(
                answer=f"Internal error while reasoning: {exc.__class__.__name__}",
                confidence=0.0,
                source="inference",
                missing_data=[],
            ),
            tool_calls=trace,
        )

    suggestions: list[str] = []
    try:
        structured, suggestions = _coerce(final)
    except (ValueError, ValidationError, json.JSONDecodeError):
        logger.warning("Final answer failed schema validation — repairing.")
        repair = conversation + [
            {"role": "assistant", "content": final},
            {
                "role": "user",
                "content": (
                    "Your previous reply was not valid JSON. Re-emit it as a single "
                    "JSON object with keys: answer (string), confidence (0-1), "
                    "source ('resume' or 'inference'), missing_data (string array), "
                    "and _suggestions (string array of 3 follow-up questions). "
                    "No prose, no fences."
                ),
            },
        ]
        try:
            repaired = llm.tool_calling_loop(
                system_instruction=SYSTEM_PROMPT,
                conversation=repair,
                tool_declarations=TOOL_DECLARATIONS,
                tool_executor=executor,
                on_tool_call=on_tool,
            )
            structured, suggestions = _coerce(repaired)
        except Exception:
            structured = _FALLBACK_ANSWER
            suggestions = []

    session.history.append(ChatTurn(role="user", content=user_message))
    session.history.append(ChatTurn(role="assistant", content=structured.answer))
    return ChatResponse(
        session_id=session.id,
        structured=structured,
        tool_calls=trace,
        suggestions=suggestions,
    )
