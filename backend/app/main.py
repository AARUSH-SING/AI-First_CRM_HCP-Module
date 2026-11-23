from __future__ import annotations

from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load repo-root `.env` (e.g. GROQ_API_KEY, GROQ_MODEL) before importing the agent.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .agent import run_log_interaction_via_langgraph
from .schemas import AiLogRequest, AiLogResponse, ExtractionResult

app = FastAPI(title="AI-First CRM HCP Module (Backend)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if not _frontend_dist.exists():
    _frontend_dist = Path(__file__).resolve().parents[1] / "static"


@app.get("/")
def root():
    if _frontend_dist.exists() and (_frontend_dist / "index.html").exists():
        return FileResponse(_frontend_dist / "index.html")
    return {
        "name": "AI-First CRM HCP Module Backend",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _drop_nones(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}


@app.post("/ai/log-interaction", response_model=AiLogResponse)
def ai_log_interaction(payload: AiLogRequest) -> AiLogResponse:
    try:
        tool_json = run_log_interaction_via_langgraph(
            message=payload.message,
            current_form=payload.currentForm,
        )
        extraction = ExtractionResult.model_validate(tool_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    extracted_patch = _drop_nones(extraction.extracted.model_dump())
    return AiLogResponse(
        extracted=extracted_patch,
        summary=extraction.summary,
        suggestedFollowUps=extraction.suggestedFollowUps,
    )


if _frontend_dist.exists() and (_frontend_dist / "index.html").exists():
    if (_frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=_frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        file_path = _frontend_dist / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_frontend_dist / "index.html")


