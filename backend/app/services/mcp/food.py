"""
services/mcp/food.py — Swiggy Food MCP client.

CONCEPT: What is MCP (Model Context Protocol)?
------------------------------------------------
MCP is a standard protocol that lets AI agents talk to external services
via a defined tool interface. Instead of writing custom API integrations,
you connect to an MCP server and call "tools" by name with structured inputs.

Swiggy's Food MCP exposes these tools:
  - search_restaurants   → find restaurants by location + filters
  - get_restaurant_menu  → get full menu for a restaurant
  - search_menu          → search dishes across restaurants
  - update_food_cart     → add/remove items from cart
  - get_food_cart        → get current cart contents
  - place_food_order     → place the order (Phase 2)
  - track_food_order     → track order status (Phase 2)

CONCEPT: Mock-first development
---------------------------------
We don't have Swiggy MCP keys yet. So we build the client with:
  1. The exact same interface the real client will have
  2. Mock responses that mirror real MCP response shapes

When keys arrive, we replace _mock_search_restaurants() with a real
MCP tool call — zero changes to orchestrator.py or planner.py.
This pattern is called "programming to an interface."

CONCEPT: Why async methods?
----------------------------
MCP calls are network calls — they take time (50-500ms each).
If we used sync (blocking) Python, the server would freeze during
each call, unable to handle other requests.
With async, we just "await" the result and the event loop handles
other requests in the meantime. This is why asyncio.gather() in
orchestrator.py is so powerful — 3 async calls run concurrently.
"""

import json
import asyncio
from typing import Any
from app.core.config import settings


class FoodMCPClient:
    """
    Client for Swiggy Food MCP server.

    Wraps all Food MCP tool calls behind clean async methods.
    Currently returns mock data — swap _call_mcp() implementation
    when real credentials arrive.

    Usage:
        client = FoodMCPClient()
        results = await client.search_restaurants(
            location="Koramangala, Bangalore",
            dietary_filters=["Veg"],
            budget_per_head=500,
        )
    """

    def __init__(self):
        # MCP server URL from config — empty until Swiggy grants access
        self.server_url = settings.SWIGGY_MCP_FOOD_URL
        self.api_key = settings.SWIGGY_API_KEY
        # Flag to use mock data when MCP credentials aren't configured
        self.use_mock = not bool(self.server_url and self.api_key)

    async def _call_mcp(self, tool_name: str, params: dict) -> dict:
        """
        Core MCP tool invocation.

        CONCEPT: MCP tool call structure
        ----------------------------------
        Every MCP call follows the same pattern:
          - tool_name: which tool to invoke (e.g. "search_restaurants")
          - params: structured input matching that tool's schema
          - returns: structured output defined by the tool

        In production this will use the MCP Python SDK:
            from mcp import ClientSession
            async with ClientSession(self.server_url) as session:
                result = await session.call_tool(tool_name, params)
                return result.content

        For now we route to mock methods.
        """
        if self.use_mock:
            return await self._mock_dispatch(tool_name, params)

        # TODO: Replace with real MCP SDK call when credentials arrive
        # from mcp import ClientSession
        # async with ClientSession(self.server_url, api_key=self.api_key) as session:
        #     result = await session.call_tool(tool_name, params)
        #     return result.content
        raise NotImplementedError("Real MCP connection not yet configured")

    async def _mock_dispatch(self, tool_name: str, params: dict) -> dict:
        """Route mock calls to the appropriate mock method."""
        # Simulate network latency so async behaviour is realistic in dev
        await asyncio.sleep(0.1)

        dispatch = {
            "search_restaurants": self._mock_search_restaurants,
            "get_restaurant_menu": self._mock_get_restaurant_menu,
            "search_menu": self._mock_search_menu,
        }
        handler = dispatch.get(tool_name)
        if not handler:
            raise ValueError(f"Unknown Food MCP tool: {tool_name}")
        return await handler(params)

    # -------------------------------------------------------------------------
    # Public interface — these are what orchestrator.py calls
    # -------------------------------------------------------------------------

    async def search_restaurants(
        self,
        location: str,
        dietary_filters: list[str],
        budget_per_head: int,
        cuisine: str | None = None,
        health_focus: int = 50,
    ) -> dict[str, Any]:
        """
        Search for food delivery restaurants matching event criteria.

        Args:
            location: City or address string passed to Swiggy's geo-search
            dietary_filters: e.g. ["Veg", "Jain"] — filters menus accordingly
            budget_per_head: per-person budget in INR for food delivery portion
            cuisine: optional cuisine preference e.g. "North Indian"
            health_focus: 0-100, shapes how results are ranked (healthy vs indulgent)

        Returns:
            dict with "restaurants" list, each containing:
              - id, name, cuisine, rating, delivery_time, price_for_two
              - top_dishes: list of recommended dishes with prices
              - offers: active offers on this restaurant
        """
        return await self._call_mcp(
            "search_restaurants",
            {
                "location": location,
                "dietary_filters": dietary_filters,
                "budget_per_head": budget_per_head,
                "cuisine": cuisine,
                "health_focus": health_focus,
            },
        )

    async def get_restaurant_menu(self, restaurant_id: str) -> dict[str, Any]:
        """
        Fetch the full menu for a specific restaurant.

        Used after search_restaurants() when the AI wants to recommend
        specific dishes rather than just the restaurant.
        """
        return await self._call_mcp(
            "get_restaurant_menu",
            {
                "restaurant_id": restaurant_id,
            },
        )

    # -------------------------------------------------------------------------
    # Mock responses — mirror real Swiggy MCP response shapes
    # Replace internals only when real MCP is connected
    # -------------------------------------------------------------------------

    async def _mock_search_restaurants(self, params: dict) -> dict:
        """
        Mock response mirroring Swiggy Food MCP search_restaurants output.
        Restaurant names, dishes, and prices are realistic for Indian context.
        """
        budget = params.get("budget_per_head", 500)
        dietary = params.get("dietary_filters", [])
        is_veg = "Veg" in dietary or "Jain" in dietary

        restaurants = [
            {
                "id": "rest_001",
                "name": "Meghana Foods" if not is_veg else "Saravanaa Bhavan",
                "cuisine": "Andhra" if not is_veg else "South Indian",
                "rating": 4.5,
                "delivery_time_mins": 35,
                "price_for_two": min(budget * 2, 600),
                "distance_km": 1.2,
                "offers": [
                    {
                        "code": "SWIGGY50",
                        "description": "50% off up to ₹100",
                        "min_order": 199,
                    }
                ],
                "top_dishes": [
                    {
                        "name": "Biryani" if not is_veg else "Masala Dosa",
                        "price": 220,
                        "is_bestseller": True,
                    },
                    {
                        "name": "Pepper Chicken" if not is_veg else "Pongal",
                        "price": 280,
                        "is_bestseller": False,
                    },
                    {"name": "Gulab Jamun", "price": 80, "is_bestseller": False},
                ],
            },
            {
                "id": "rest_002",
                "name": "Barbeque Nation" if not is_veg else "Haldiram's",
                "cuisine": "Mughlai" if not is_veg else "North Indian",
                "rating": 4.3,
                "delivery_time_mins": 45,
                "price_for_two": min(budget * 2, 800),
                "distance_km": 2.1,
                "offers": [
                    {
                        "code": "HDFC10",
                        "description": "10% off with HDFC card",
                        "min_order": 499,
                    }
                ],
                "top_dishes": [
                    {
                        "name": "Mutton Seekh Kebab" if not is_veg else "Paneer Tikka",
                        "price": 349,
                        "is_bestseller": True,
                    },
                    {"name": "Dal Makhani", "price": 199, "is_bestseller": True},
                    {"name": "Butter Naan", "price": 49, "is_bestseller": False},
                ],
            },
            {
                "id": "rest_003",
                "name": "Social",
                "cuisine": "Continental",
                "rating": 4.1,
                "delivery_time_mins": 40,
                "price_for_two": min(budget * 2, 700),
                "distance_km": 1.8,
                "offers": [],
                "top_dishes": [
                    {"name": "Loaded Fries", "price": 249, "is_bestseller": True},
                    {
                        "name": "Quinoa Bowl"
                        if params.get("health_focus", 50) > 60
                        else "Pulled Pork Burger",
                        "price": 349,
                        "is_bestseller": False,
                    },
                    {"name": "Tiramisu", "price": 199, "is_bestseller": False},
                ],
            },
        ]

        return {
            "restaurants": restaurants,
            "location": params.get("location"),
            "filters_applied": dietary,
            "total_results": len(restaurants),
        }

    async def _mock_get_restaurant_menu(self, params: dict) -> dict:
        """Mock full menu response for a restaurant."""
        return {
            "restaurant_id": params["restaurant_id"],
            "categories": [
                {
                    "name": "Starters",
                    "items": [
                        {
                            "id": "item_001",
                            "name": "Paneer Tikka",
                            "price": 249,
                            "is_veg": True,
                        },
                        {
                            "id": "item_002",
                            "name": "Chicken 65",
                            "price": 299,
                            "is_veg": False,
                        },
                    ],
                },
                {
                    "name": "Main Course",
                    "items": [
                        {
                            "id": "item_003",
                            "name": "Dal Makhani",
                            "price": 199,
                            "is_veg": True,
                        },
                        {
                            "id": "item_004",
                            "name": "Butter Chicken",
                            "price": 349,
                            "is_veg": False,
                        },
                    ],
                },
            ],
        }

    async def _mock_search_menu(self, params: dict) -> dict:
        """Mock dish search across restaurants."""
        return {
            "dishes": [],
            "query": params.get("query", ""),
        }
