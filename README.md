# Dossier — Intelligent Resume Assistant

An agentic AI hiring assistant that reads a candidate's resume and answers a
recruiter's questions about them — with structured outputs, source
attribution, and a visible reasoning trace on every reply.

Built as the take-home for the **Agentic Architect** role at Alchemyst AI
(May 2026 hiring cycle). The full spec is in
[`.claude/fullstack-ai-assignment.md`](./.claude/fullstack-ai-assignment.md).
This README documents what I built, why, and how to run it.

> **Demo:** *[insert recorded walkthrough link here once uploaded]*

---

## TL;DR

| | |
|---|---|
| **Stack** | Next.js 16 (App Router) · FastAPI · Claude Sonnet 4.6 (Anthropic SDK) |
| **Lines** | ~1,000 lines of Python · ~2,500 lines of TypeScript |
| **Frameworks (none)** | No LangChain, no LlamaIndex — a hand-rolled tool-calling loop, ~60 lines |
| **Sessions** | In-memory `SessionStore`; bookmarks + skill-score state persisted in `localStorage` per session |
| **LLM transport** | PDFs go to Claude directly as `document` content blocks (native vision-based PDF reading). `pypdf` is used **only** to populate a `raw_text` field locally so the search tool doesn't pay for Claude to regurgitate the document. |
| **Caching** | Prompt caching on system prompt + tool declarations + resume grounding preamble — every turn after the first reuses cached input tokens. |

---

## What's in the box

**Core (assignment requirements)**

- **PDF / text resume input** — Claude reads the PDF natively; we extract a structured profile in one call.
- **Structured profile** — name, contact, links (with auto-protocol fix), summary, **categorized skills** (Frontend / Backend / AI-ML / etc.), dated experience, education with **scores**, **projects** (with tech-stack chips), **achievements & awards**.
- **Chat interface** — multi-turn, conversation history preserved across turns, color-graded confidence on every reply, "From resume" / "Inferred" source badges with tooltip explanations.
- **Strict structured output** — the assignment's mandated `{answer, confidence, source, missing_data}` shape, validated by Pydantic on the way out.
- **Guardrails** — explicit "Not in resume" handling, regex-based placeholder detector that rejects lazy `...above...` replies, single repair retry on validation failure, safe fallback if both attempts fail.

**Agent tools (model decides when)**

- `match_skills(required_skills)` — deterministic case-insensitive set match with normalization.
- `calculate_experience()` — deterministic; merges overlapping intervals so concurrent roles aren't double-counted.
- `search_resume(query)` — deterministic substring search over the raw resume text with line-anchored snippets.

**Right-rail tools (forced-tool-call flows)**

- **Strengths & Gaps** — generated during initial extraction; modal with side-by-side green strengths / red gaps panes.
- **Skill Score** — add any skills you care about → Claude rates 0–10 each with one-line reasoning. Batched in one call, persisted in localStorage, running color-graded average across all scored skills.
- **JD Match** — paste a job description → structured fit analysis: 0–100 overall fit, matched skills, missing skills, experience assessment, role-specific strengths and concerns.
- **Interview Questions** — generates 5–7 targeted interview prompts anchored in specific resume details (companies, projects, techs by name) — each with a *rationale* (why ask) and *what to listen for*.
- **Bookmarks** — bookmark any AI reply; persisted per session.

**UX touches**

- Multi-phase animated **scanning indicator** while Claude reads the PDF.
- **Markdown rendering** in answers (`**bold**`, lists, inline `code`, links).
- **Claude-generated follow-up suggestions** under every reply — third-person about the candidate, never "tell me about your X" interview prompts.
- Subtle cyan border-on-hover on the resume + chat cards.
- Continuous **HSL red→green gradient** on the confidence bar (no banded colors).

---

## Architecture

```
┌────────────────────────────────┐         ┌──────────────────────────────────┐
│   Next.js 16 · App Router      │         │   FastAPI · Anthropic SDK         │
│                                │  HTTP   │                                   │
│   • Upload + scan animation    ├────────►│   POST /api/upload                │
│   • Dossier panel              │   JSON  │   POST /api/chat                  │
│   • Chat + answer cards        │         │   POST /api/score-skills          │
│   • Tool rail + 5 modals       │         │   POST /api/jd-match              │
│                                │         │   POST /api/interview-questions   │
│   localStorage:                │         │   GET  /api/health                │
│   bookmarks / skill scores     │         │                                   │
└────────────────────────────────┘         │   ┌───────────────────────────┐   │
                                           │   │  agent.py                 │   │
                                           │   │   SYSTEM_PROMPT           │   │
                                           │   │   3 deterministic tools   │   │
                                           │   │   tool-calling loop       │   │
                                           │   │   _coerce() + repair      │   │
                                           │   │   placeholder detector    │   │
                                           │   └────────────┬──────────────┘   │
                                           │                │                  │
                                           │   ┌────────────▼─────────────┐    │
                                           │   │  llm.py (Anthropic SDK)  │    │
                                           │   │   extract_resume()       │───►│  Claude
                                           │   │   score_skills()         │    │ Sonnet 4.6
                                           │   │   analyze_jd_match()     │    │
                                           │   │   generate_interview_qs()│    │
                                           │   │   tool_calling_loop()    │    │
                                           │   │   prompt caching         │    │
                                           │   └──────────────────────────┘    │
                                           │                                   │
                                           │   memory.py: in-mem SessionStore  │
                                           └───────────────────────────────────┘
```

### Backend layout (`backend/app/`)

| File         | Responsibility                                                       |
|--------------|----------------------------------------------------------------------|
| `config.py`  | `.env` settings (Anthropic key, model, CORS origin).                 |
| `schemas.py` | All Pydantic models — the single source of truth for API shapes.     |
| `memory.py`  | Thread-safe in-memory `SessionStore` keyed by session id.            |
| `llm.py`     | Anthropic SDK wrapper — `extract_resume`, `score_skills`, `analyze_jd_match`, `generate_interview_questions`, `tool_calling_loop`. Prompt caching on system + tools + grounding preamble. Local `_extract_raw_text` for the search tool. |
| `agent.py`   | `SYSTEM_PROMPT`, the three deterministic tools, the orchestration loop, the validate-and-repair flow, and the placeholder detector. |
| `routes.py`  | FastAPI handlers — translate HTTP ↔ agent / llm calls.               |
| `main.py`    | App factory + dev-friendly CORS regex (localhost + private LAN ranges). |

### Frontend layout (`frontend/`)

| Path                                  | Responsibility                                                |
|---------------------------------------|---------------------------------------------------------------|
| `app/page.tsx`                        | Single-page composition + top-level state.                    |
| `app/layout.tsx`, `app/globals.css`   | Theme tokens, fonts (Geist + Instrument Serif), animations.   |
| `components/Header.tsx`               | Wordmark + "New resume" reset button.                         |
| `components/UploadZone.tsx`           | Drop zone + multi-phase scanning animation.                   |
| `components/ResumePanel.tsx`          | Structured dossier — categorized skills, projects, education with scores, achievements. |
| `components/ChatPanel.tsx`            | Messages list, composer, suggested-follow-up chips, empty state. |
| `components/AnswerCard.tsx`           | Markdown answer + source badge + HSL confidence bar + bookmark button. |
| `components/ChatToolBar.tsx`          | Vertical right-rail of 5 tool buttons with hover/active states. |
| `components/StrengthsGapsModal.tsx`   | Side-by-side strengths (green) / gaps (red) view.             |
| `components/SkillScoreModal.tsx`      | Add-and-batch-score flow with running average %.              |
| `components/JdMatchModal.tsx`         | JD paste + structured fit analysis.                           |
| `components/InterviewQuestionsModal.tsx` | Focus input + numbered question cards with rationale + listen-for. |
| `components/BookmarksModal.tsx`       | localStorage-backed bookmark viewer.                          |
| `lib/api.ts`                          | Fetch wrappers for all backend endpoints.                     |
| `lib/types.ts`                        | TS mirrors of the Pydantic models.                            |
| `lib/utils.ts`                        | `cn()`, `ensureProtocol()`, `confidenceColor()` (HSL gradient). |
| `lib/bookmarks.ts`, `lib/skillScores.ts` | localStorage-backed hooks for persistent tool state.      |

---

## Agentic design — how each rubric item is met

### Role alignment (Agentic Design — 25%)

The system prompt in `agent.py` defines the agent as a hiring-side
assistant, lists what it *will* and *will not* discuss, and instructs it to
refuse off-topic queries with `source: "inference"` and `confidence: 1.0`.

### Context management

`memory.Session` holds the structured resume, the conversation history
(`ChatTurn[]`), and the most recent user intent. Every chat call rebuilds
the conversation from session state, so prior turns survive across requests
without re-uploading the resume. A compact *grounding preamble* summarises
the structured resume so the prompt doesn't bloat with raw text — the raw
text is reachable on demand via the `search_resume` tool.

### Tool usage (the model decides)

Three deterministic agent tools live in `agent.py`. They're sent to Claude
via the Anthropic function-calling API; automatic function calling is
**disabled** so the loop in `llm.tool_calling_loop()` can intercept every
call. The system prompt tells the model to use a tool whenever the answer
depends on a *specific, verifiable fact* and to answer directly only for
summaries and refusals.

Beyond those three, the right-rail tools (Skill Score, JD Match,
Interview Questions, Strengths & Gaps) are **forced-tool-call** flows —
one-shot Claude calls with `tool_choice` pinned to a structured submit
tool, so the result shape is guaranteed by the API.

### Guardrails (Reliability — 15%)

- **System-prompt rules** — `NEVER fabricate`, `NEVER invent skills/years/companies`, explicit `"Not mentioned in resume"` requirement, banned-placeholder list (`...above...`, `(see above)`, `as mentioned earlier`).
- **Strict schema validation** — `StructuredAnswer` Pydantic model with `extra="forbid"`. The agent's textual output is parsed and validated.
- **Repair retry** — on validation failure (or placeholder detection), the loop re-prompts Claude with an explicit "re-emit as valid JSON" instruction. One retry.
- **Safe fallback** — if the repair also fails, a polite fallback answer is returned rather than malformed JSON.
- **Placeholder detection** — regex sweeps the answer text for known dodge patterns and rejects them before they reach the user.
- **Confidence calibration** — the prompt prescribes a 4-band confidence guide; the UI then renders confidence as a continuous HSL red→green gradient so low-confidence claims are visually obvious.
- **Tool errors don't crash the agent** — a thrown tool gets wrapped as `{"error": "..."}` and fed back to the model so it can recover.

### Structured output (mandatory)

The spec requires every chat reply to match:

```ts
{ answer: string, confidence: 0-1, source: "resume" | "inference", missing_data: string[] }
```

This is the `StructuredAnswer` Pydantic model in `schemas.py`, with
`extra="forbid"`. The model's text output is parsed, the four spec fields
are validated, and the additional `_suggestions` field (used for the
follow-up question chips) is plucked separately so the spec contract stays
clean.

---

## Trade-offs

- **Provider: Claude Sonnet 4.6.** Reads PDFs natively as `document`
  content blocks — no third-party PDF parser in the AI path. Forced tool
  calls give robust JSON without prompt-and-pray. The provider is isolated
  to `llm.py` — swapping to OpenAI is a one-file change.

- **`pypdf` for `raw_text` extraction only.** The agent's `search_resume`
  tool needs plain text for substring search. Instead of asking Claude to
  regurgitate the entire document in its JSON output (which would add
  ~1,500 output tokens = ~15-25s of extra latency), we extract text
  locally with `pypdf` in <100 ms. The PDF still goes to Claude directly
  for *structured* extraction.

- **Prompt caching.** The system prompt + tool declarations + the
  resume-grounding preamble are marked `cache_control: ephemeral`. Every
  turn after the first reuses cached input tokens — meaningful cost +
  latency win on long sessions.

- **In-memory sessions, no DB.** Two-day budget, single recruiter at a
  time. The `SessionStore` interface is intentionally narrow so a SQLite
  or Redis swap is mechanical and touches no other module. The right-rail
  state that *should* survive a backend restart (bookmarks, skill scores)
  is persisted client-side in `localStorage` per session.

- **No streaming.** The structured-answer shape doesn't stream well —
  the UI needs the whole JSON to render the confidence bar, source
  badge, and missing-data chips together. I chose clarity over
  token-by-token. Streaming the *tool trace* (each call as it resolves)
  is the better future direction.

- **Hand-rolled tool loop, no agent framework.** With three deterministic
  tools + four forced-tool flows, LangChain or LlamaIndex would have
  been more orchestration surface than logic. `tool_calling_loop` is
  about 60 lines and visibly does exactly what the spec asks.

- **WebRTC voice bonus skipped.** Per the spec, optional. The "no STT,
  no TTS" constraint implies a voice-native model (OpenAI Realtime /
  Gemini Live), and Claude doesn't have an equivalent API today. Adding
  it cleanly would mean a second provider for a single feature —
  out of scope for the time budget.

---

## Running it locally

### Prerequisites

- Python 3.11+ (3.12 tested)
- Node 20+ (Node 24 tested)
- An Anthropic API key from <https://console.anthropic.com/settings/keys>

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                # then paste your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/api/health` → `{"status": "ok"}`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local    # defaults NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open <http://localhost:3000>.

### Sanity flow (60 seconds)

1. Drop in a resume — try `backend/sample_resumes/jane_developer.txt`, or your own PDF.
2. Watch the multi-phase scanning animation.
3. When the dossier loads, ask three questions:
   - **Factual** — *"How many years of experience does the candidate have?"* → expect `From resume`, high confidence.
   - **Missing-data** — *"What's the candidate's salary expectation?"* → expect `Inferred`, the `Not in resume` amber chip, and a populated `missing_data` array.
   - **Inference** — *"What's their strongest area, and the biggest concern?"* → expect `Inferred`, mid-band confidence.
4. Hit the **Skill Score** tool, add `Python`, `Kubernetes`, `Leadership`, click *Update score* — one batched Claude call, scores persist on refresh.
5. Hit **JD Match**, paste any JD off LinkedIn, click *Analyze fit*.
6. Hit **+ New resume** in the top bar to confirm the session resets cleanly.

---

## Future work

- **Streaming the tool trace** over SSE so each agent step appears the moment it resolves.
- **Resume highlights** — link `search_resume` snippets back to source lines in a viewer, so a reviewer can see the literal evidence behind a claim.
- **Multi-candidate comparison** — the session model already supports it; add a top-level `Workspace` and a side-by-side dossier view.
- **Persistence** — swap `SessionStore` for SQLite-via-SQLAlchemy. No other module needs to change.
- **WebRTC voice bonus** — implementable via OpenAI Realtime or Gemini Live as a *second* provider (Claude doesn't expose a voice-native API today).
