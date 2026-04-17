from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Sentiment = Literal["positive", "neutral", "negative"]
InteractionType = Literal["Meeting", "Call", "Email", "Virtual"]


class InteractionForm(BaseModel):
    hcpName: str = ""
    interactionType: InteractionType = "Meeting"
    date: str = ""
    time: str = ""
    attendees: str = ""
    topicsDiscussed: str = ""
    materialsShared: list[str] = Field(default_factory=list)
    samplesDistributed: list[str] = Field(default_factory=list)
    sentiment: Sentiment = "neutral"
    outcomes: str = ""
    followUpActions: str = ""
    aiSuggestedFollowUps: list[str] = Field(default_factory=list)


class AiLogRequest(BaseModel):
    message: str = Field(min_length=1)
    currentForm: InteractionForm = Field(default_factory=InteractionForm)


class AiLogResponse(BaseModel):
    extracted: dict = Field(default_factory=dict)
    summary: str = ""
    suggestedFollowUps: list[str] = Field(default_factory=list)


class ExtractedInteraction(BaseModel):
    """
    Subset/patch of InteractionForm fields.
    Any field may be omitted if not inferable.
    """

    hcpName: Optional[str] = None
    interactionType: Optional[InteractionType] = None
    date: Optional[str] = None
    time: Optional[str] = None
    attendees: Optional[str] = None
    topicsDiscussed: Optional[str] = None
    materialsShared: Optional[list[str]] = None
    samplesDistributed: Optional[list[str]] = None
    sentiment: Optional[Sentiment] = None
    outcomes: Optional[str] = None
    followUpActions: Optional[str] = None


class ExtractionResult(BaseModel):
    extracted: ExtractedInteraction = Field(default_factory=ExtractedInteraction)
    summary: str = Field(default="")
    suggestedFollowUps: list[str] = Field(default_factory=list, max_length=8)

