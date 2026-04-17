from __future__ import annotations

from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load repo-root `.env` (e.g. GROQ_API_KEY, GROQ_MODEL) before importing the agent.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .agent import run_log_interaction_via_langgraph
from .schemas import AiLogRequest, AiLogResponse, ExtractionResult

app = FastAPI(title="AI-First CRM HCP Module (Backend)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

