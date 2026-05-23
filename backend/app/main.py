"""FastAPI entry point."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Intelligent Resume Assistant",
        description="Agentic AI for resume analysis with structured outputs and guardrails.",
        version="1.0.0",
    )
    # Dev-friendly CORS: localhost + any LAN IP in 192.168.x.x / 10.x.x.x / 172.16-31.x.x.
    # Matches whatever host the dev hits the Next.js server from (LAN testing,
    # VirtualBox/WSL bridge, etc.). For prod, swap to an explicit allow_origins list.
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=(
            r"^https?://("
            r"localhost|127\.0\.0\.1|"
            r"192\.168\.\d{1,3}\.\d{1,3}|"
            r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
            r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
            r")(:\d+)?$"
        ),
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
