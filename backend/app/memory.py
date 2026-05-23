"""In-memory session store. Holds the resume + conversation history + last
intent for each upload — the spec's required "structured memory across
interactions"."""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from typing import Literal

from .schemas import ResumeData


@dataclass
class ChatTurn:
    role: Literal["user", "assistant"]
    content: str


@dataclass
class Session:
    id: str
    resume: ResumeData
    history: list[ChatTurn] = field(default_factory=list)
    last_intent: str | None = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()

    def create(self, resume: ResumeData) -> Session:
        session = Session(id=uuid.uuid4().hex, resume=resume)
        with self._lock:
            self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> Session | None:
        with self._lock:
            return self._sessions.get(session_id)


store = SessionStore()
