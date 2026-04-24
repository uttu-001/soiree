"""
services/offers/engine.py — Live offer fetching and discount engine.

CONCEPT: Why offers get their own service
-------------------------------------------
Offers are the most time-sensitive data in Soirée:
  - Restaurant menus: change every few hours → cache 30 min
  - Restaurant list: changes daily → cache 1 hr
  - Swiggy offers: can expire by the minute → NEVER cache stale

An offer shown to the user must be valid at checkout. If we show a
"50% off" that expired 10 minutes ago, the user gets a checkout error
and loses trust. So:
  1. Fetch offers live at plan generation time
  2. Store the offer with its expiry in the Plan record
  3. Re-validate at checkout before placing the order

CONCEPT: Offer types on Swiggy
---------------------------------
Swiggy has several offer types relevant to Soirée:
  - PERCENTAGE: "50% off up to ₹100" — most common
  - FLAT:       "₹75 off on orders above ₹299"
  - BANK:       "10% off with HDFC card" — payment method specific
  - LOYALTY:    "Swiggy One member discount"
  - COMBO:      "Buy 2 get 1 free" — Instamart specific

We surface all types and let the AI mention them in the plan.
At checkout, we recommend the optimal payment method based on
which bank offer gives the highest saving.

CONCEPT: Mock-first, same as MCP clients
------------------------------------------
Real offers will come from Swiggy's offer APIs once we have access.
Mock data mirrors realistic offer structures so the AI prompt
and frontend rendering are built correctly from day one.
"""

import asyncio
from typing import Any
from app.core.config import settings
from app.core.redis import get_redis


class OffersEngine:
    """
    Fetches and caches live Swiggy offers for a given location and budget.

    Offers are cached in Redis with a short TTL (OFFERS_CACHE_TTL = 5 min).
    This is a compromise: fresh enough to be accurate, short enough to avoid
    showing expired offers. Re-validated at checkout regardless.

    Usage:
        engine = OffersEngine()
        offers = await engine.get_active_offers(
            location="Bangalore",
            budget=2000,
        )
    """

    async def get_active_offers(
        self,
        location: str,
        budget: int,
    ) -> list[dict[str, Any]]:
        """
        Fetch active Swiggy offers relevant to this event's location and budget.

        Checks Redis cache first (5 min TTL). On cache miss, fetches live
        and stores result. Returns empty list on any error — offers are
        non-critical, the plan generates fine without them.

        Args:
            location: city/area string — offers can be city-specific
            budget: total event budget — used to filter minimum-order offers

        Returns:
            list of offer dicts, each with:
              - service: "food" | "instamart" | "dineout"
              - type: "percentage" | "flat" | "bank" | "combo"
              - code: promo code string
              - description: human-readable offer text
              - min_order: minimum order value to unlock
              - max_saving: cap on discount in INR
              - payment_method: bank/card required (if bank offer), else None
              - expires_at: ISO timestamp or None
        """
        cache_key = f"offers:{location.lower().replace(' ', '_')}:{budget // 500}"

        try:
            redis = await get_redis()
            cached = await redis.get(cache_key)
            if cached:
                import json

                return json.loads(cached)
        except Exception:
            # Redis failure is non-critical — continue to live fetch
            pass

        # Fetch live offers
        offers = await self._fetch_live_offers(location, budget)

        # Cache with TTL
        try:
            import json

            redis = await get_redis()
            await redis.set(cache_key, json.dumps(offers), ex=settings.OFFERS_CACHE_TTL)
        except Exception:
            pass  # Cache write failure is non-critical

        return offers

    async def _fetch_live_offers(
        self,
        location: str,
        budget: int,
    ) -> list[dict[str, Any]]:
        """
        Fetch live offers from Swiggy APIs.
        Currently returns mock data — replace with real API calls when available.
        """
        # Simulate network latency
        await asyncio.sleep(0.05)
        return self._mock_offers(location, budget)

    def _mock_offers(self, location: str, budget: int) -> list[dict[str, Any]]:
        """
        Mock offer data mirroring realistic Swiggy offer structures.
        Offers are filtered by min_order relative to the event budget.
        """
        all_offers = [
            {
                "service": "food",
                "type": "percentage",
                "code": "SWIGGY50",
                "description": "50% off up to ₹100 on your first order",
                "min_order": 199,
                "max_saving": 100,
                "payment_method": None,
                "expires_at": None,
            },
            {
                "service": "food",
                "type": "bank",
                "code": "HDFC10",
                "description": "10% off with HDFC Bank cards",
                "min_order": 499,
                "max_saving": 150,
                "payment_method": "HDFC",
                "expires_at": None,
            },
            {
                "service": "instamart",
                "type": "flat",
                "code": "INSTA75",
                "description": "₹75 off on Instamart orders above ₹299",
                "min_order": 299,
                "max_saving": 75,
                "payment_method": None,
                "expires_at": None,
            },
            {
                "service": "dineout",
                "type": "percentage",
                "code": "EARLYBIRD15",
                "description": "15% off on pre-booked dine-in",
                "min_order": 500,
                "max_saving": 300,
                "payment_method": None,
                "expires_at": None,
            },
            {
                "service": "food",
                "type": "bank",
                "code": "ICICI20",
                "description": "20% off with ICICI credit cards",
                "min_order": 800,
                "max_saving": 200,
                "payment_method": "ICICI",
                "expires_at": None,
            },
        ]

        # Only return offers whose min_order is achievable within this budget
        return [o for o in all_offers if o["min_order"] <= budget]
