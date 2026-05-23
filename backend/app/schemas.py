"""Pydantic schemas — single source of truth for shapes the API exchanges
with the frontend and the agent produces.

`StructuredAnswer` is the mandated response shape from the assignment."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExperienceEntry(BaseModel):
    role: str
    company: str
    start: str | None = Field(None, description="e.g. 'Jan 2020' or '2020-01'")
    end: str | None = Field(None, description="e.g. 'Present' or 'Dec 2023'")
    description: str | None = None


class EducationEntry(BaseModel):
    degree: str
    institution: str
    year: str | None = None
    score: str | None = Field(
        None,
        description="GPA, CGPA, percentage, class rank, or other achievement marker.",
    )


class SkillCategory(BaseModel):
    name: str = Field(description="Category label e.g. 'Frontend', 'Backend', 'AI/ML'.")
    items: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)
    date: str | None = None
    url: str | None = None


class Achievement(BaseModel):
    title: str
    description: str | None = None
    date: str | None = None


class ResumeLink(BaseModel):
    label: str
    url: str


class ResumeData(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    summary: str | None = None
    skills: list[SkillCategory] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    achievements: list[Achievement] = Field(default_factory=list)
    links: list[ResumeLink] = Field(default_factory=list)
    # Surfaced via the "Strengths & Gaps" tool in the UI, not the dossier.
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    # Starter questions Claude suggests after reading the resume.
    suggested_questions: list[str] = Field(default_factory=list)
    raw_text: str = Field(
        default="",
        description="Full plain text — kept for search-tool grounding.",
    )


class ToolCall(BaseModel):
    """One step in the agent's reasoning trace, surfaced to the UI."""

    name: str
    arguments: dict
    result_preview: str = ""


class StructuredAnswer(BaseModel):
    """Mandated response shape (assignment spec)."""

    model_config = ConfigDict(extra="forbid")

    answer: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: Literal["resume", "inference"]
    missing_data: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    structured: StructuredAnswer
    tool_calls: list[ToolCall] = Field(default_factory=list)
    # Follow-up questions Claude suggests for the next turn.
    suggestions: list[str] = Field(default_factory=list)


class UploadResponse(BaseModel):
    session_id: str
    resume: ResumeData


class SkillScore(BaseModel):
    skill: str
    score: int = Field(ge=0, le=10)
    reasoning: str


class ScoreSkillsRequest(BaseModel):
    session_id: str
    skills: list[str]


class ScoreSkillsResponse(BaseModel):
    scores: list[SkillScore]


class JdMatchResult(BaseModel):
    overall_fit: int = Field(ge=0, le=100, description="Overall fit percentage 0-100.")
    fit_summary: str = Field(description="One-paragraph summary of fit.")
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    experience_assessment: str = Field(
        description="One paragraph: does the candidate's experience meet the role's requirements?"
    )
    key_strengths: list[str] = Field(default_factory=list)
    key_concerns: list[str] = Field(default_factory=list)


class JdMatchRequest(BaseModel):
    session_id: str
    job_description: str


class JdMatchResponse(BaseModel):
    result: JdMatchResult


class InterviewQuestion(BaseModel):
    question: str
    rationale: str = Field(description="Why this question, anchored to resume specifics.")
    listen_for: str = Field(description="What a strong answer should include.")


class InterviewQuestionsRequest(BaseModel):
    session_id: str
    focus: str = Field(
        description="Topic, skill, theme, or gap to probe. Free text from the user.",
    )


class InterviewQuestionsResponse(BaseModel):
    focus: str
    questions: list[InterviewQuestion]
