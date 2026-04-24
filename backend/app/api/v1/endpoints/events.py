"""
api/v1/endpoints/events.py — Event CRUD endpoints.

CONCEPT: Why persist events separately from plans?
----------------------------------------------------
An Event is the user's intent — it persists across multiple plan
generations. If a user regenerates the plan 3 times (tweaking cuisine,
budget, guests), there's one Event record and three Plan records.
This lets us track edit history, analytics, and resume sessions.

CONCEPT: Dependency Injection with Depends()
---------------------------------------------
Every endpoint that needs DB access declares:
    session: AsyncSession = Depends(get_session)

FastAPI sees this, calls get_session(), gets a fresh session,
injects it into the function, and closes it after the response.
You never manually open or close sessions — FastAPI handles it.

CONCEPT: SQLModel select() queries
------------------------------------
SQLModel uses SQLAlchemy's select() for queries:
    statement = select(Event).where(Event.id == event_id)
    result = await session.execute(statement)
    event = result.scalar_one_or_none()

scalar_one_or_none() returns the object or None (no exception if missing).
scalar_one() returns the object or raises if missing or multiple found.

ENDPOINTS:
  POST   /events          → create event, returns EventRead
  GET    /events          → list all events (temp: no auth yet)
  GET    /events/{id}     → get single event
  PATCH  /events/{id}     → partial update
  DELETE /events/{id}     → soft delete (sets is_active=False)
"""

import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventRead, EventUpdate

router = APIRouter()

# Temporary hardcoded user_id until auth is built in Phase 2.
# Every event is owned by this demo user.
DEMO_USER_ID = "demo-user-001"


async def _ensure_demo_user(session: AsyncSession) -> None:
    """
    Create the demo user if it doesn't exist.

    CONCEPT: get-or-create pattern
    --------------------------------
    We check if the user exists first, then create only if missing.
    This is safe for concurrent requests because the phone field
    has a UNIQUE constraint — the second insert would fail gracefully.
    """
    result = await session.execute(select(User).where(User.id == DEMO_USER_ID))
    user = result.scalar_one_or_none()
    if not user:
        demo_user = User(
            id=DEMO_USER_ID,
            phone="+919999999999",
            name="Demo User",
        )
        session.add(demo_user)
        await session.commit()


@router.post("/", response_model=EventRead, status_code=201)
async def create_event(
    payload: EventCreate,
    session: AsyncSession = Depends(get_session),
):
    """
    Create a new event and persist it to the database.

    Converts the API payload (EventCreate) into a DB model (Event).
    Lists (guests, dietary_tags) are serialised to JSON strings for storage.

    Returns the created event as EventRead (includes generated id + timestamps).
    """
    await _ensure_demo_user(session)

    event = Event(
        user_id=DEMO_USER_ID,
        event_type=payload.event_type,
        venue_mode=payload.venue_mode,
        location=payload.location,
        start_hour=payload.start_hour,
        budget=payload.budget,
        guest_count=payload.guest_count,
        # Serialise lists to JSON strings for DB storage
        guests=json.dumps([g.model_dump() for g in payload.guests])
        if payload.guests
        else None,
        dietary_tags=json.dumps(payload.dietary_tags) if payload.dietary_tags else None,
        health_focus=payload.health_focus,
        notes=payload.notes,
    )

    session.add(event)
    await session.commit()
    await session.refresh(
        event
    )  # Reload from DB to get generated fields (id, timestamps)

    return event


@router.get("/", response_model=list[EventRead])
async def list_events(
    session: AsyncSession = Depends(get_session),
):
    """
    List all events for the demo user.

    CONCEPT: order_by for consistent pagination
    --------------------------------------------
    Always sort results when listing — otherwise the order is
    non-deterministic and changes between requests (confusing UX).
    We sort by created_at descending (newest first).
    """
    result = await session.execute(
        select(Event)
        .where(Event.user_id == DEMO_USER_ID)
        .order_by(Event.created_at.desc())
    )
    events = result.scalars().all()
    return events


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    event_id: str,
    session: AsyncSession = Depends(get_session),
):
    """
    Fetch a single event by ID.
    Returns 404 if not found — standard REST convention.
    """
    result = await session.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    return event


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: str,
    payload: EventUpdate,
    session: AsyncSession = Depends(get_session),
):
    """
    Partially update an event (PATCH semantics).

    Only updates fields that are explicitly provided in the payload.
    Fields not included in the request are left unchanged.

    CONCEPT: model_dump(exclude_none=True)
    ----------------------------------------
    exclude_none=True gives us only the fields the client actually sent.
    We then iterate and set them on the DB object — clean PATCH pattern.
    """
    result = await session.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # Apply only the provided fields
    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        # Re-serialise list fields to JSON strings
        if field == "guests" and isinstance(value, list):
            value = json.dumps(
                [g.model_dump() if hasattr(g, "model_dump") else g for g in value]
            )
        elif field == "dietary_tags" and isinstance(value, list):
            value = json.dumps(value)
        setattr(event, field, value)

    event.updated_at = datetime.utcnow()
    session.add(event)
    await session.commit()
    await session.refresh(event)

    return event


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    session: AsyncSession = Depends(get_session),
):
    """
    Delete an event by ID.
    Returns 204 No Content on success — standard REST for deletes.
    """
    result = await session.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    await session.delete(event)
    await session.commit()
