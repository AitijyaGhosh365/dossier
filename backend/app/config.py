"""Runtime configuration loaded from environment."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str
    anthropic_model: str
    frontend_origin: str


def get_settings() -> Settings:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env "
            "and paste your key from https://console.anthropic.com/settings/keys"
        )
    return Settings(
        anthropic_api_key=api_key,
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6").strip(),
        frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").strip(),
    )
