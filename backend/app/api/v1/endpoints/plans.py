"""
api/v1/endpoints/plans.py — Plan generation and management endpoints.

CONCEPT: StreamingResponse for SSE
-------------------------------------
Normal FastAPI endpoints return a complete JSON response at once.
For plan generation, we stream Claude's output token-by-token using
Server-Sent Events (SSE) — the browser receives and renders each chunk
as it arrives, so the user sees the plan being written in real time.

FastAPI's StreamingResponse accepts an async generator and streams
whatever it yields directly to the HTTP response.

SSE headers:
  Content-Type: text/event-stream   ← tells browser this is an SSE stream
  Cache-Control: no-cache           ← don't buffer the stream
  X-Accel-Buffering: no             ← disable Nginx buffering (important in prod)

CONCEPT: How the frontend consumes this
-----------------------------------------
The Next.js frontend uses the browser's EventSource API or a fetch
with ReadableStream to consume the SSE. Each "data: <token>\n\n" chunk
is appended to the UI string, and section markers like [TIMELINE] trigger
rendering of specific plan components.

ENDPOINTS IN THIS FILE:
  POST /plans/generate     → stream a new plan (SSE)
  POST /plans/chat         → follow-up chat message (SSE)
  GET  /plans/{plan_id}    → fetch a saved plan (Phase 2)
  POST /plans/{plan_id}/order → place all orders (Phase 2)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.plan import PlanRequest
from app.services.ai.planner import generate_plan, generate_followup

router = APIRouter()


@router.post("/generate", summary="Generate an event plan (streaming)")
async def create_plan(request: PlanRequest):
    """
    Generate a complete event plan using Swiggy MCP + Claude.

    Returns a Server-Sent Events stream. Each chunk is a piece of the
    plan text as Claude writes it. The stream ends with "data: [DONE]".

    Flow:
      1. Validate PlanRequest (Pydantic handles this automatically)
      2. Fire parallel Swiggy MCP calls (Food + Instamart + Dineout)
      3. Fetch live offers
      4. Stream Claude's plan generation token-by-token

    Frontend usage:
      const response = await fetch('/api/v1/plans/generate', {
        method: 'POST',
        body: JSON.stringify(planRequest),
      });
      const reader = response.body.getReader();
      // read chunks and append to UI
    """

    async def event_stream():
        async for chunk in generate_plan(request.model_dump()):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering in production
            "Access-Control-Allow-Origin": "*",  # Allow frontend to read the stream
        },
    )


@router.post("/chat", summary="Follow-up chat on an existing plan (streaming)")
async def chat_followup(
    user_message: str,
    event_data: dict,
    conversation_history: list[dict] = [],
):
    """
    Handle follow-up messages after a plan is generated.

    E.g. "make it more romantic", "we added a vegan guest",
    "suggest cocktail pairings", "switch the restaurant to Italian".

    The conversation_history maintains context across multiple follow-ups
    so the user doesn't have to repeat themselves.

    Args:
        user_message: the follow-up question or instruction
        event_data: original event config (passed from frontend state)
        conversation_history: list of {role, content} dicts from this session
    """

    async def event_stream():
        async for chunk in generate_followup(
            user_message=user_message,
            conversation_history=conversation_history,
            event_data=event_data,
        ):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{plan_id}", summary="Fetch a saved plan")
async def get_plan(plan_id: str):
    """
    Retrieve a previously generated and saved plan by ID.
    Phase 2 feature — requires user auth and plan persistence.
    """
    raise HTTPException(status_code=501, detail="Plan persistence coming in Phase 2")


@router.post("/{plan_id}/order", summary="Place all orders for an approved plan")
async def place_order(plan_id: str):
    """
    Agentic ordering: approve a plan and let the AI place all Swiggy orders.

    Calls in sequence:
      1. book_table (Dineout MCP) — if dineout is in the plan
      2. place_food_order (Food MCP) — if food delivery is in the plan
      3. checkout (Instamart MCP) — if Instamart cart is in the plan

    Always shows a confirmation screen before this endpoint is called.
    Phase 2 feature.
    """
    raise HTTPException(status_code=501, detail="Agentic ordering coming in Phase 2")
