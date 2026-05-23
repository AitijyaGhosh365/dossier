"""HTTP boundary."""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from . import llm
from .agent import run_agent
from .memory import store
from .schemas import (
    ChatRequest,
    ChatResponse,
    InterviewQuestionsRequest,
    InterviewQuestionsResponse,
    JdMatchRequest,
    JdMatchResponse,
    ScoreSkillsRequest,
    ScoreSkillsResponse,
    UploadResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

MAX_RESUME_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=UploadResponse)
async def upload_resume(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB.")

    try:
        resume = llm.extract_resume(file.filename, data)
    except Exception as exc:
        logger.exception("Resume extraction failed")
        raise HTTPException(status_code=400, detail=f"Could not parse resume: {exc}") from exc

    session = store.create(resume)
    logger.info("Session %s — skills=%d, roles=%d", session.id, len(resume.skills), len(resume.experience))
    return UploadResponse(session_id=session.id, resume=resume)


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    session = store.get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found. Upload a resume first.")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Empty message.")
    return run_agent(session, req.message.strip())


@router.post("/score-skills", response_model=ScoreSkillsResponse)
async def score_skills(req: ScoreSkillsRequest) -> ScoreSkillsResponse:
    session = store.get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found. Upload a resume first.")
    cleaned = [s.strip() for s in req.skills if s.strip()]
    if not cleaned:
        return ScoreSkillsResponse(scores=[])

    try:
        scores = llm.score_skills(session.resume, cleaned)
    except Exception as exc:
        logger.exception("Skill scoring failed")
        raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}") from exc
    return ScoreSkillsResponse(scores=scores)


@router.post("/jd-match", response_model=JdMatchResponse)
async def jd_match(req: JdMatchRequest) -> JdMatchResponse:
    session = store.get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found. Upload a resume first.")
    jd = req.job_description.strip()
    if len(jd) < 30:
        raise HTTPException(
            status_code=400,
            detail="Job description is too short. Paste the full description.",
        )

    try:
        result = llm.analyze_jd_match(session.resume, jd)
    except Exception as exc:
        logger.exception("JD match failed")
        raise HTTPException(status_code=500, detail=f"JD match failed: {exc}") from exc
    return JdMatchResponse(result=result)


@router.post("/interview-questions", response_model=InterviewQuestionsResponse)
async def interview_questions(
    req: InterviewQuestionsRequest,
) -> InterviewQuestionsResponse:
    session = store.get(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found. Upload a resume first.")

    focus = req.focus.strip()
    try:
        questions = llm.generate_interview_questions(session.resume, focus)
    except Exception as exc:
        logger.exception("Interview questions generation failed")
        raise HTTPException(
            status_code=500, detail=f"Interview question generation failed: {exc}"
        ) from exc
    return InterviewQuestionsResponse(focus=focus, questions=questions)


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}
