"""
schemas/plan_response.py — Response schema for saved plan data.

Separate from PlanRequest (what comes IN) — this defines
what we send BACK when fetching a saved plan.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlanReadResponse(BaseModel):
    """Response shape for GET /plans/{id}"""

    id: str
    event_id: str
    user_id: str
    status: str
    dineout_options: Optional[str] = None
    food_options: Optional[str] = None
    instamart_cart: Optional[str] = None
    health_insight: Optional[str] = None
    active_offers: Optional[str] = None
    total_cost: Optional[int] = None
    total_savings: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
