"""
services/mcp/dineout.py — Swiggy Dineout MCP client.

Dineout is Swiggy's table reservation service — the "going out" half
of Soirée's hybrid mode. It handles:
  - Finding restaurants suitable for dine-in (different from delivery)
  - Checking real-time slot availability
  - Booking a table for a specific time and party size

Swiggy Dineout MCP tools:
  - search_restaurants_dineout → find dine-in restaurants
  - get_restaurant_details     → full info: menu, ambience, photos
  - get_available_slots        → real-time availability for a date/time/party
  - book_table                 → make a reservation (Phase 2)
  - get_booking_status         → check reservation status (Phase 2)

CONCEPT: Dineout vs Food search — why they're different clients
----------------------------------------------------------------
Although both search "restaurants," they serve different purposes:
  - Food search: delivery radius, packaging quality, delivery time matter
  - Dineout search: ambience, parking, occasion-fit, dress code matter

The AI planner uses different prompting strategies for each:
  - Food: "best biryani under ₹300 that delivers in 30 min"
  - Dineout: "romantic rooftop restaurant for 2, anniversary vibe, ₹2000 budget"

CONCEPT: Slot availability is time-sensitive
---------------------------------------------
Unlike food menus (cached 30min), slot availability changes by the minute
as other users book. We NEVER cache slot data — always fetch live.
This is enforced in the orchestrator via a no-cache flag.
"""

import asyncio
from typing import Any
from app.core.config import settings


class DineoutMCPClient:
    """
    Client for Swiggy Dineout MCP server.

    Handles restaurant discovery and table reservations for dine-in events.
    Slot availability is always fetched live — never cached.

    Usage:
        client = DineoutMCPClient()
        results = await client.search_restaurants(
            location="Bandra, Mumbai",
            guest_count=4,
            dietary_filters=["Veg"],
            event_type="birthday",
            budget_per_head=1000,
        )
    """

    def __init__(self):
        self.server_url = settings.SWIGGY_MCP_DINEOUT_URL
        self.api_key = settings.SWIGGY_API_KEY
        self.use_mock = not bool(self.server_url and self.api_key)

    async def _call_mcp(self, tool_name: str, params: dict) -> dict:
        """Core MCP tool invocation — see food.py for full explanation."""
        if self.use_mock:
            return await self._mock_dispatch(tool_name, params)
        # TODO: Real MCP SDK call
        # from mcp import ClientSession
        # async with ClientSession(self.server_url, api_key=self.api_key) as session:
        #     result = await session.call_tool(tool_name, params)
        #     return result.content
        raise NotImplementedError("Real MCP connection not yet configured")

    async def _mock_dispatch(self, tool_name: str, params: dict) -> dict:
        """Route mock calls to appropriate mock method."""
        await asyncio.sleep(0.1)
        dispatch = {
            "search_restaurants_dineout": self._mock_search_restaurants,
            "get_restaurant_details": self._mock_get_restaurant_details,
            "get_available_slots": self._mock_get_available_slots,
        }
        handler = dispatch.get(tool_name)
        if not handler:
            raise ValueError(f"Unknown Dineout MCP tool: {tool_name}")
        return await handler(params)

    # -------------------------------------------------------------------------
    # Public interface
    # -------------------------------------------------------------------------

    async def search_restaurants(
        self,
        location: str,
        guest_count: int,
        dietary_filters: list[str],
        event_type: str = "date",
        budget_per_head: int = 1000,
        start_hour: int = 20,
    ) -> dict[str, Any]:
        """
        Search for dine-in restaurants matching event criteria.

        Also fetches available slots for top results in one shot —
        avoids a second round-trip when the orchestrator needs both.

        Args:
            location: city or neighbourhood for geo-search
            guest_count: party size (used for table availability check)
            dietary_filters: cuisine/dietary constraints
            event_type: shapes ambience filtering (romantic/corporate/casual)
            budget_per_head: per-person spend limit in INR
            start_hour: preferred start time in 24h (used for slot search)

        Returns:
            dict with "restaurants" list, each containing:
              - id, name, cuisine, rating, cost_for_two, ambience tags
              - available_slots: list of bookable time slots
              - offers: active Dineout offers (pre-payment discounts etc.)
        """
        return await self._call_mcp(
            "search_restaurants_dineout",
            {
                "location": location,
                "guest_count": guest_count,
                "dietary_filters": dietary_filters,
                "event_type": event_type,
                "budget_per_head": budget_per_head,
                "start_hour": start_hour,
            },
        )

    async def get_available_slots(
        self,
        restaurant_id: str,
        date: str,
        party_size: int,
        preferred_hour: int,
    ) -> dict[str, Any]:
        """
        Fetch real-time slot availability for a specific restaurant.

        IMPORTANT: Never cache this — slots change in real time.
        Called when user wants to check a specific restaurant's availability
        after the initial plan is generated.

        Args:
            restaurant_id: from search_restaurants response
            date: ISO date string e.g. "2026-04-25"
            party_size: number of guests
            preferred_hour: preferred time in 24h, e.g. 20 for 8 PM

        Returns:
            dict with available time slots as strings e.g. ["7:30 PM", "8:00 PM", "8:30 PM"]
        """
        return await self._call_mcp(
            "get_available_slots",
            {
                "restaurant_id": restaurant_id,
                "date": date,
                "party_size": party_size,
                "preferred_hour": preferred_hour,
            },
        )

    async def get_restaurant_details(self, restaurant_id: str) -> dict[str, Any]:
        """
        Fetch full restaurant details: menu highlights, ambience, photos, policies.
        Used when the AI needs more context to write a compelling recommendation.
        """
        return await self._call_mcp(
            "get_restaurant_details",
            {
                "restaurant_id": restaurant_id,
            },
        )

    # -------------------------------------------------------------------------
    # Mock responses
    # -------------------------------------------------------------------------

    async def _mock_search_restaurants(self, params: dict) -> dict:
        """
        Mock Dineout search response.
        Restaurants are occasion-appropriate with realistic Indian pricing.
        """
        event_type = params.get("event_type", "date")
        budget = params.get("budget_per_head", 1000)
        guests = params.get("guest_count", 2)
        hour = params.get("start_hour", 20)

        # Format preferred time for slot display
        preferred_time = f"{hour}:00 {'AM' if hour < 12 else 'PM'}"
        slot_times = (
            [f"{hour - 1}:30 PM", f"{hour}:00 PM", f"{hour}:30 PM", f"{hour + 1}:00 PM"]
            if hour > 12
            else [preferred_time]
        )

        restaurants = [
            {
                "id": "dine_001",
                "name": "Farzi Cafe"
                if event_type in ("date", "friends")
                else "The Leela Terrace",
                "cuisine": "Modern Indian",
                "rating": 4.6,
                "cost_for_two": min(budget * 2, 1800),
                "ambience": ["Rooftop", "Romantic", "Live Music"]
                if event_type == "date"
                else ["Casual", "Trendy"],
                "distance_km": 1.5,
                "dress_code": "Smart Casual",
                "known_for": [
                    "Molecular gastronomy",
                    "Craft cocktails",
                    "Instagram-worthy plating",
                ],
                "available_slots": slot_times[:3],
                "offers": [
                    {
                        "type": "pre_booking",
                        "description": "15% off on pre-booking",
                        "code": "EARLYBIRD15",
                    },
                ],
            },
            {
                "id": "dine_002",
                "name": "Punjab Grill"
                if event_type == "family"
                else "Smoke House Deli",
                "cuisine": "North Indian" if event_type == "family" else "European",
                "rating": 4.4,
                "cost_for_two": min(budget * 2, 2200),
                "ambience": ["Family-friendly", "Spacious"]
                if event_type == "family"
                else ["Intimate", "Cosy"],
                "distance_km": 2.3,
                "dress_code": "Casual",
                "known_for": ["Dal Makhani", "Tandoori platters"]
                if event_type == "family"
                else ["Wood-fired pizza", "All-day brunch"],
                "available_slots": slot_times[:2],
                "offers": [
                    {
                        "type": "discount",
                        "description": "20% off for groups of 4+",
                        "code": "GROUP20",
                    },
                ]
                if guests >= 4
                else [],
            },
            {
                "id": "dine_003",
                "name": "The Black Sheep Bistro",
                "cuisine": "Contemporary",
                "rating": 4.5,
                "cost_for_two": min(budget * 2, 2500),
                "ambience": ["Chic", "Intimate", "Wine bar"],
                "distance_km": 3.1,
                "dress_code": "Smart Casual",
                "known_for": [
                    "Extensive wine list",
                    "Chef's tasting menu",
                    "Housemade pasta",
                ],
                "available_slots": slot_times,
                "offers": [],
            },
        ]

        return {
            "restaurants": restaurants,
            "location": params.get("location"),
            "guest_count": guests,
            "total_results": len(restaurants),
            "note": "Slots fetched live — availability may change",
        }

    async def _mock_get_available_slots(self, params: dict) -> dict:
        """Mock slot availability for a specific restaurant."""
        hour = params.get("preferred_hour", 20)
        return {
            "restaurant_id": params["restaurant_id"],
            "date": params.get("date"),
            "party_size": params.get("party_size"),
            "available_slots": [
                f"{hour - 1}:30 PM",
                f"{hour}:00 PM",
                f"{hour}:30 PM",
            ],
            "note": "Slots are live — book quickly to confirm",
        }

    async def _mock_get_restaurant_details(self, params: dict) -> dict:
        """Mock detailed restaurant info."""
        return {
            "restaurant_id": params["restaurant_id"],
            "description": "A contemporary dining experience with a focus on seasonal ingredients and bold flavours.",
            "highlights": [
                "Chef's table available",
                "Private dining room for groups",
                "Valet parking",
            ],
            "parking": True,
            "accepts_large_groups": True,
        }
