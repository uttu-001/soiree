"""
services/mcp/instamart.py — Swiggy Instamart MCP client.

Instamart is Swiggy's 10-minute grocery delivery service.
In Soirée, it handles the "stay in" and "hybrid" event modes —
delivering groceries, snacks, beverages, and party supplies
directly to the event venue.

Swiggy Instamart MCP tools:
  - search_products   → find grocery/product listings
  - update_cart       → add/remove products from cart
  - get_cart          → current cart contents + total
  - checkout          → place the Instamart order (Phase 2)
  - track_order       → live delivery tracking (Phase 2)
  - get_orders        → order history

CONCEPT: Event-type driven product selection
---------------------------------------------
Unlike Food (where the AI picks restaurants), Instamart requires us
to translate an event type into a product shopping list:

  house_party  → chips, dips, soft drinks, paper cups, napkins, ice
  date         → candles, flowers, chocolates, premium snacks, juice
  birthday     → cake (if not ordered), balloons, decorations, snacks
  corporate    → tea/coffee sachets, biscuits, bottled water, tissues
  family       → cooking ingredients, fresh produce, snacks for kids

The AI planner decides the high-level list; this client fetches
real product IDs and prices from Instamart's catalog.
"""

import asyncio
from typing import Any
from app.core.config import settings


class InstamartMCPClient:
    """
    Client for Swiggy Instamart MCP server.

    Translates event context into a recommended grocery/supplies cart.
    Mock responses mirror real Instamart product catalog structure.

    Usage:
        client = InstamartMCPClient()
        results = await client.search_products(
            event_type="house_party",
            guest_count=10,
            dietary_tags=["Veg"],
        )
    """

    def __init__(self):
        self.server_url = settings.SWIGGY_MCP_INSTAMART_URL
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
            "search_products": self._mock_search_products,
            "get_cart": self._mock_get_cart,
        }
        handler = dispatch.get(tool_name)
        if not handler:
            raise ValueError(f"Unknown Instamart MCP tool: {tool_name}")
        return await handler(params)

    # -------------------------------------------------------------------------
    # Public interface
    # -------------------------------------------------------------------------

    async def search_products(
        self,
        event_type: str,
        guest_count: int,
        dietary_tags: list[str],
        budget: int | None = None,
    ) -> dict[str, Any]:
        """
        Search for Instamart products appropriate for the event type.

        The product list is shaped by event_type and scaled by guest_count.
        E.g. a house_party for 20 people needs more chips bags than one for 4.

        Args:
            event_type: one of date/friends/birthday/corporate/house_party/family
            guest_count: number of attendees (used to scale quantities)
            dietary_tags: e.g. ["Veg"] — filters out non-veg snacks
            budget: optional INR cap for the Instamart portion

        Returns:
            dict with "categories" list, each containing products with:
              - product_id, name, brand, quantity, unit, price, image_url
              - recommended_quantity: how many units to buy for this event
        """
        return await self._call_mcp(
            "search_products",
            {
                "event_type": event_type,
                "guest_count": guest_count,
                "dietary_tags": dietary_tags,
                "budget": budget,
            },
        )

    async def get_cart(self, cart_id: str) -> dict[str, Any]:
        """Fetch current Instamart cart contents and running total."""
        return await self._call_mcp("get_cart", {"cart_id": cart_id})

    # -------------------------------------------------------------------------
    # Mock responses
    # -------------------------------------------------------------------------

    async def _mock_search_products(self, params: dict) -> dict:
        """
        Mock Instamart product catalog response.
        Products are grouped by category, quantities scaled to guest count.
        """
        event_type = params.get("event_type", "friends")
        guests = params.get("guest_count", 4)
        is_veg = "Veg" in params.get("dietary_tags", [])

        # Scale quantities to guest count
        # Rule of thumb: 1 chips bag per 3 guests, 1 drink per guest etc.
        chips_qty = max(1, guests // 3)
        drinks_qty = max(2, guests // 2)

        # Product catalog varies by event type
        event_products = {
            "house_party": [
                {
                    "category": "Snacks",
                    "items": [
                        {
                            "product_id": "im_001",
                            "name": "Lay's Classic Salted Chips",
                            "brand": "Lay's",
                            "price": 40,
                            "unit": "73g pack",
                            "recommended_qty": chips_qty,
                        },
                        {
                            "product_id": "im_002",
                            "name": "Kurkure Masala Munch",
                            "brand": "Kurkure",
                            "price": 30,
                            "unit": "90g pack",
                            "recommended_qty": chips_qty,
                        },
                        {
                            "product_id": "im_003",
                            "name": "Bikaji Bhujia",
                            "brand": "Bikaji",
                            "price": 60,
                            "unit": "200g",
                            "recommended_qty": max(1, guests // 5),
                        },
                    ],
                },
                {
                    "category": "Beverages",
                    "items": [
                        {
                            "product_id": "im_010",
                            "name": "Coca-Cola",
                            "brand": "Coca-Cola",
                            "price": 45,
                            "unit": "1.25L bottle",
                            "recommended_qty": drinks_qty,
                        },
                        {
                            "product_id": "im_011",
                            "name": "Sprite",
                            "brand": "Sprite",
                            "price": 45,
                            "unit": "1.25L bottle",
                            "recommended_qty": drinks_qty,
                        },
                        {
                            "product_id": "im_012",
                            "name": "Frooti Mango Drink",
                            "brand": "Parle Agro",
                            "price": 20,
                            "unit": "200ml",
                            "recommended_qty": guests,
                        },
                    ],
                },
                {
                    "category": "Party Supplies",
                    "items": [
                        {
                            "product_id": "im_020",
                            "name": "Paper Cups",
                            "brand": "Chuk",
                            "price": 99,
                            "unit": "pack of 50",
                            "recommended_qty": 1,
                        },
                        {
                            "product_id": "im_021",
                            "name": "Napkins",
                            "brand": "Tissues Plus",
                            "price": 49,
                            "unit": "pack of 100",
                            "recommended_qty": 1,
                        },
                    ],
                },
            ],
            "date": [
                {
                    "category": "Ambience",
                    "items": [
                        {
                            "product_id": "im_030",
                            "name": "Tealight Candles",
                            "brand": "Hosley",
                            "price": 149,
                            "unit": "pack of 12",
                            "recommended_qty": 1,
                        },
                        {
                            "product_id": "im_031",
                            "name": "Rose Petals",
                            "brand": "Fresh Flowers",
                            "price": 99,
                            "unit": "pack",
                            "recommended_qty": 1,
                        },
                    ],
                },
                {
                    "category": "Gourmet Snacks",
                    "items": [
                        {
                            "product_id": "im_032",
                            "name": "Ferrero Rocher",
                            "brand": "Ferrero",
                            "price": 399,
                            "unit": "16 pieces",
                            "recommended_qty": 1,
                        },
                        {
                            "product_id": "im_033",
                            "name": "Pringles Original",
                            "brand": "Pringles",
                            "price": 199,
                            "unit": "107g",
                            "recommended_qty": 1,
                        },
                    ],
                },
                {
                    "category": "Beverages",
                    "items": [
                        {
                            "product_id": "im_034",
                            "name": "Raw Pressery Apple Juice",
                            "brand": "Raw Pressery",
                            "price": 99,
                            "unit": "250ml",
                            "recommended_qty": 2,
                        },
                    ],
                },
            ],
            "corporate": [
                {
                    "category": "Hot Beverages",
                    "items": [
                        {
                            "product_id": "im_040",
                            "name": "Nescafé Classic",
                            "brand": "Nestlé",
                            "price": 245,
                            "unit": "100g jar",
                            "recommended_qty": 1,
                        },
                        {
                            "product_id": "im_041",
                            "name": "Tata Tea Gold",
                            "brand": "Tata",
                            "price": 159,
                            "unit": "250g pack",
                            "recommended_qty": 1,
                        },
                        {
                            "product_id": "im_042",
                            "name": "Sugar Sachets",
                            "brand": "Generic",
                            "price": 49,
                            "unit": "pack of 50",
                            "recommended_qty": 1,
                        },
                    ],
                },
                {
                    "category": "Biscuits & Snacks",
                    "items": [
                        {
                            "product_id": "im_043",
                            "name": "Britannia Good Day",
                            "brand": "Britannia",
                            "price": 35,
                            "unit": "pack of 5",
                            "recommended_qty": max(1, guests // 5),
                        },
                        {
                            "product_id": "im_044",
                            "name": "Parle-G",
                            "brand": "Parle",
                            "price": 10,
                            "unit": "pack",
                            "recommended_qty": max(2, guests // 4),
                        },
                    ],
                },
                {
                    "category": "Water",
                    "items": [
                        {
                            "product_id": "im_045",
                            "name": "Bisleri Water",
                            "brand": "Bisleri",
                            "price": 20,
                            "unit": "1L bottle",
                            "recommended_qty": guests,
                        },
                    ],
                },
            ],
        }

        # Default to friends category if event type not specifically mapped
        products = event_products.get(event_type, event_products["house_party"])

        # Calculate estimated total
        total = sum(
            item["price"] * item["recommended_qty"]
            for category in products
            for item in category["items"]
        )

        return {
            "categories": products,
            "event_type": event_type,
            "guest_count": guests,
            "estimated_total": total,
            "delivery_estimate_mins": 15,  # Instamart's 10-15 min promise
        }

    async def _mock_get_cart(self, params: dict) -> dict:
        """Mock cart contents response."""
        return {
            "cart_id": params.get("cart_id"),
            "items": [],
            "total": 0,
            "delivery_fee": 25,
        }
