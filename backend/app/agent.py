from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

from .schemas import ExtractionResult, InteractionForm

# Groq retired `gemma2-9b-it` (see https://console.groq.com/docs/deprecations).
# Default: strong general + tool use. Override with GROQ_MODEL, e.g. `llama-3.1-8b-instant`
# (official Gemma 2 9B replacement on Groq).
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


def _groq_model_id() -> str:
    return os.environ.get("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL


@lru_cache(maxsize=4)
def _base_llm_for_model(model: str) -> ChatGroq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Missing GROQ_API_KEY. Set it in your environment before starting the backend."
        )

    return ChatGroq(
        api_key=api_key,
        model=model,
        temperature=0.2,
    )


def _base_llm() -> ChatGroq:
    return _base_llm_for_model(_groq_model_id())


def _structured_llm():
    return _base_llm().with_structured_output(ExtractionResult)


@tool("fetch_hcp_profile")
def fetch_hcp_profile(hcp_name: str) -> str:
    """
    Lookup an HCP profile by name (mocked).
    In production this would query the CRM DB / MDM, apply territory access, and return a minimal profile.
    """
    profile = {
        "hcpName": hcp_name,
        "specialty": "Cardiology",
        "site": "Example Medical Center",
        "preferredChannel": "In-person",
        "lastInteraction": "2026-03-28",
    }
    return json.dumps(profile)


@tool("compliance_guardrail_check")
def compliance_guardrail_check(text: str) -> str:
    """
    Flag high-risk compliance content (mocked).
    In production this would run a classifier + rules (off-label, inducement, claims, adverse event cues).
    """
    flags = []
    lowered = text.lower()
    if "off-label" in lowered or "unapproved" in lowered:
        flags.append("Potential off-label discussion detected")
    if "adverse" in lowered or "side effect" in lowered:
        flags.append("Potential AE mention detected; trigger AE workflow")
    return json.dumps({"ok": len(flags) == 0, "flags": flags})


@tool("suggest_next_best_action")
def suggest_next_best_action(context: str) -> str:
    """
    Suggest next best action for the rep based on interaction context.
    """
    llm = _base_llm()
    msg = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are a life-sciences field CRM assistant. "
                    "Return 3 short next-best actions as a JSON array of strings."
                )
            ),
            HumanMessage(content=context),
        ]
    )
    return msg.content


@tool("generate_followup_email")
def generate_followup_email(hcp_name: str, summary: str) -> str:
    """
    Draft a short compliant follow-up email (mocked).
    """
    llm = _base_llm()
    msg = llm.invoke(
        [
            SystemMessage(
                content=(
                    "Draft a concise, professional follow-up email for an HCP. "
                    "Avoid promotional claims. Keep it under 140 words."
                )
            ),
            HumanMessage(content=f"HCP: {hcp_name}\nSummary: {summary}"),
        ]
    )
    return msg.content


@tool("log_interaction")
def log_interaction(note: str, current_form_json: str) -> str:
    """
    Extract and summarize interaction details from free-text into the structured CRM form.
    Uses an LLM for entity extraction, normalization, and summarization.
    """
    try:
        current_form = InteractionForm.model_validate_json(current_form_json)
    except Exception:
        current_form = InteractionForm()

    llm = _structured_llm()
    result: ExtractionResult = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You extract structured HCP interaction fields for a life-sciences CRM. "
                    "Output a PATCH (only fields that are confidently inferable). "
                    "Normalize sentiment to positive|neutral|negative. "
                    "If date/time is not explicit, do not guess. "
                    "Suggested follow-ups must be realistic rep actions and be compliant."
                )
            ),
            HumanMessage(
                content=(
                    "CURRENT_FORM_JSON:\n"
                    f"{current_form.model_dump_json()}\n\n"
                    "FREE_TEXT_NOTE:\n"
                    f"{note}\n"
                )
            ),
        ]
    )

    return result.model_dump_json()


@tool("edit_interaction")
def edit_interaction(existing_interaction_json: str, instruction: str) -> str:
    """
    Modify an existing logged interaction based on user instruction (e.g., corrections).
    Uses an LLM to generate a minimal patch and updated summary/followups.
    """
    llm = _structured_llm()
    result: ExtractionResult = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are editing a previously logged HCP interaction. "
                    "Apply the user's instruction and output a PATCH (only fields that change). "
                    "Do not fabricate missing facts."
                )
            ),
            HumanMessage(
                content=(
                    "EXISTING_INTERACTION_JSON:\n"
                    f"{existing_interaction_json}\n\n"
                    "EDIT_INSTRUCTION:\n"
                    f"{instruction}\n"
                )
            ),
        ]
    )
    return result.model_dump_json()


@lru_cache(maxsize=1)
def build_langgraph_agent():
    llm = _base_llm()
    tools = [
        fetch_hcp_profile,
        compliance_guardrail_check,
        suggest_next_best_action,
        generate_followup_email,
        log_interaction,
        edit_interaction,
    ]
    return create_react_agent(llm, tools)


def run_log_interaction_via_langgraph(message: str, current_form: InteractionForm) -> dict[str, Any]:
    """
    Run the LangGraph tool-calling agent and return the log_interaction tool output.
    """
    agent = build_langgraph_agent()

    system = SystemMessage(
        content=(
            "You are an AI assistant for life-sciences field reps logging HCP interactions. "
            "Always call the `log_interaction` tool when the user provides an interaction description. "
            "After calling tools, keep the final assistant message short."
        )
    )

    human = HumanMessage(
        content=(
            "Log this interaction into structured fields.\n\n"
            f"NOTE:\n{message}\n\n"
            "CURRENT_FORM_JSON:\n"
            f"{current_form.model_dump_json()}\n\n"
            "Use the `log_interaction` tool with:\n"
            f'- note="{message}"\n'
            f"- current_form_json=<CURRENT_FORM_JSON above>\n"
        )
    )

    out = agent.invoke({"messages": [system, human]})
    messages = out.get("messages", [])

    tool_payload: Optional[str] = None
    for m in reversed(messages):
        if getattr(m, "type", None) == "tool" and getattr(m, "name", None) == "log_interaction":
            tool_payload = getattr(m, "content", None)
            break

    if not tool_payload:
        raise RuntimeError("Agent did not call log_interaction tool as expected.")

    parsed = json.loads(tool_payload)
    return parsed

