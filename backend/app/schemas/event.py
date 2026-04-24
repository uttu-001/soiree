"""
schemas/event.py — Request/response schemas for event endpoints.

Separates what the API accepts/returns from what the DB stores.
EventCreate: what the client sends to create an event.
EventRead: what we send back (includes id, status, timestamps).
EventUpdate: partial update — only fields the user can change.

CONCEPT: Optional fields in updates (PATCH semantics)
-------------------------------------------------------
For update operations we use Optional for every field with default=None.
This means "if the client sends this field, update it; if not, leave it."
This is PATCH behaviour — partial updates without overwriting everything.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.plan import EventType, VenueMode, Guest


class EventCreate(BaseModel):
    """Payload for POST /events — create a new event."""

    event_type: EventType
    venue_mode: VenueMode
    location: str = Field(..., min_length=2)
    start_hour: int = Field(default=20, ge=10, le=23)
    budget: int = Field(..., ge=500, le=50000)
    guest_count: int = Field(..., ge=1, le=100)
    guests: list[Guest] = []
    dietary_tags: list[str] = []
    health_focus: int = Field(default=50, ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class EventRead(BaseModel):
    """Response shape for GET /events and POST /events."""

    id: str
    user_id: str
    event_type: EventType
    venue_mode: VenueMode
    location: str
    start_hour: int
    budget: int
    guest_count: int
    guests: Optional[str] = None  # Raw JSON string from DB
    dietary_tags: Optional[str] = None  # Raw JSON string from DB
    health_focus: int
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Allows creating from SQLModel objects


class EventUpdate(BaseModel):
    """Payload for PATCH /events/{id} — partial update."""

    location: Optional[str] = None
    start_hour: Optional[int] = Field(default=None, ge=10, le=23)
    budget: Optional[int] = Field(default=None, ge=500, le=50000)
    guest_count: Optional[int] = Field(default=None, ge=1, le=100)
    guests: Optional[list[Guest]] = None
    dietary_tags: Optional[list[str]] = None
    health_focus: Optional[int] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = None
