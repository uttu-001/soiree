# Soirée — Life Events Concierge

> AI-powered event planning built on Swiggy's MCP platform (Food · Instamart · Dineout).
> Plan a date night, house party, corporate dinner, or birthday — then approve and let the agent place every order.

---

## What is Soirée?

Soirée is a full-stack AI concierge that orchestrates complete evening experiences using Swiggy's three live MCP APIs. You describe your event — who, what, where, budget — and the AI generates a complete plan: restaurant booking, food delivery picks, and grocery cart, stitched into a minute-by-minute evening timeline.

Once you approve the plan, the order agent calls Swiggy's APIs autonomously — Dineout reservation, food delivery, and Instamart cart — in a single flow.

---

## The Core Insight

Swiggy now exposes all three sides of an evening:

| MCP Server | What it enables |
|---|---|
| **Dineout** | Search restaurants, check slot availability, book a table |
| **Food** | Search restaurants, browse menus, manage cart, place delivery orders |
| **Instamart** | Search grocery products, manage cart, checkout, track delivery |

No one has built the **full-evening arc** before: start at a restaurant (Dineout), continue at home with delivery + groceries (Food + Instamart). Soirée orchestrates all three in one plan.

---

## Current Status

| Layer | Status |
|---|---|
| FastAPI backend | ✅ Working |
| SQLModel DB models (User, Event, Plan) | ✅ Working |
| Swiggy MCP clients (Food, Instamart, Dineout) | ✅ Mock mode — awaiting credentials |
| MCP Orchestrator (asyncio.gather) | ✅ Working |
| Offer engine (Redis cache) | ✅ Working |
| Claude streaming plan generation | ✅ Working |
| Events CRUD API | ✅ Working |
| Next.js frontend | ✅ Working |
| Swiggy MCP real credentials | ⏳ Access requested |
| Phone OTP auth | 🔜 Phase 2 |
| Agentic ordering | 🔜 Phase 2 |

---

## Features

### Phase 1 — Plan & Present ✅ Built
- **Event setup** — 6 occasion types: Date / Friends Night / Birthday / Corporate / House Party / Family Dinner
- **Guest roster** — named guests with per-person dietary tags, or headcount-only mode
- **Location picker** — GPS detect or city/area text search
- **Venue mode** — Dine Out (Dineout only) / Stay In (Food + Instamart) / Hybrid (full arc)
- **Dietary + health context** — per-guest dietary flags (Veg, Vegan, Keto, Jain, Gluten-Free, Halal, No-Nuts) + wellness slider
- **AI plan generation** — Claude claude-sonnet-4-20250514 streams a complete plan via SSE: timeline, Dineout pick + slot, food delivery options, Instamart cart
- **Offer & discount engine** — live Swiggy offers fetched, filtered by budget, displayed with savings
- **Events persistence** — events saved to Postgres with full CRUD API

### Phase 2 — Approve & Order 🔜
- One-tap autonomous ordering — agent calls `place_food_order` + `checkout` + `book_table`
- Live order tracking across all 3 Swiggy services
- Shareable plan card with guest RSVP
- Phone OTP auth (MSG91)
- User memory — learned preferences across events
- Native mobile app (React Native)

### Phase 3 — Scale 🔜
- Group consensus mode — guests submit preferences, AI finds optimal menu
- Slack / Teams bot (`/soiree lunch 12 people`)
- Corporate billing + GST receipts
- Multi-city support, repeat event templates

---

## Architecture

### Data Flow

```
User input (event config)
        │
        ▼
  FastAPI endpoint — Pydantic validates PlanRequest
        │
        ▼
  asyncio.gather() — parallel execution
  ├── MCPOrchestrator.gather_context()
  │     ├── FoodMCPClient.search_restaurants()
  │     ├── InstamartMCPClient.search_products()
  │     └── DineoutMCPClient.search_restaurants()
  └── OffersEngine.get_active_offers() [Redis cached, 5min TTL]
        │
        ▼
  build_user_prompt() — MCP JSON injected into Claude prompt
        │
        ▼
  Claude claude-sonnet-4-20250514 streams response
  [BRIEF] [TIMELINE] [DINEOUT] [FOOD] [INSTAMART] [HEALTH] [OFFERS] [COST]
        │
        ▼
  SSE stream → Next.js frontend (ReadableStream reader)
        │
        ▼
  parsePlan() — section markers extracted into structured cards
        │
        ▼
  Rendered: Timeline card, Dineout card, Food card, Instamart card,
            Offers card, Cost card
```

### Key Technical Decisions

**1. `asyncio.gather()` for parallel MCP calls**
All three Swiggy MCP servers fire simultaneously. Serial calls would cost 3× the latency. With gather(), a hybrid event completes in the time of the slowest single call (~300ms vs ~750ms serial).

**2. SSE streaming with `⏎` proxy encoding**
Claude streams token-by-token. Newlines in the stream were getting dropped by the SSE framing protocol — section markers like `[TIMELINE]` were arriving on empty frames without `data:` prefix and getting lost. Fix: newlines are encoded as `⏎` on the backend before SSE framing, decoded back to `\n` on the frontend after reassembly.

**3. Collect-then-send instead of token streaming**
After testing, token-by-token SSE caused section markers to be split across frames unpredictably. The backend now collects the full Claude response, encodes newlines, and sends as a single SSE message. Trade-off: ~5 second wait, then instant full render.

**4. AI handles reasoning, MCP handles data**
All restaurant names, prices, slots, and products come from live Swiggy MCP calls. Claude handles tone, sequencing, and plan structure only. This prevents hallucinated restaurant names — a real trust-breaker.

**5. Offers fetched live, re-validated at checkout**
Offers are fetched at plan generation time with a 5-minute Redis TTL. Re-validated at checkout before any order is placed. Never cached stale.

**6. Mandatory confirmation before any autonomous order**
The order agent (Phase 2) always surfaces a confirmation screen before calling any Swiggy order API. One-step undo available for 60 seconds post-order via Swiggy cancel API.

---

## Tech Stack

### Backend (Python)

| Layer | Technology | Why |
|---|---|---|
| API server | **FastAPI** | Async-native, Pydantic built-in, SSE via StreamingResponse |
| AI | **Anthropic Python SDK** + claude-sonnet-4-20250514 | Native streaming, tool chaining |
| MCP | **mcp Python SDK** | Connects to all 3 Swiggy MCP servers |
| Database | **PostgreSQL** + **SQLModel** | SQLAlchemy + Pydantic fused — no schema duplication |
| Migrations | **Alembic** | Standard SQLAlchemy migration tool |
| Cache | **Redis** | Offer TTLs (5min), session storage, Celery broker |
| Background jobs | **Celery** | Async order placement (Phase 2) |
| Auth | **FastAPI-Users** + **MSG91 OTP** | Phone OTP — India-first (Phase 2) |
| Testing | **pytest** + **pytest-asyncio** + **respx** | Mock MCP responses in CI |

### Frontend

| Layer | Technology |
|---|---|
| Web | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Fonts | Cormorant Garamond (display) + DM Sans (body) |
| State | React hooks (useState, useRef, custom usePlanStream) |
| Streaming | Native fetch + ReadableStream |

### Infrastructure

| Layer | Technology |
|---|---|
| Local dev | Docker (soiree-postgres + soiree-redis containers) |
| Python env | Conda (soiree env, Python 3.12) |
| API hosting | Railway (planned) |
| Frontend hosting | Vercel (planned) |
| CI/CD | GitHub Actions (pytest on push) |

---

## Project Structure

```
soiree/
├── backend/
│   ├── app/
│   │   ├── main.py                        # FastAPI app, lifespan, CORS
│   │   ├── core/
│   │   │   ├── config.py                  # Pydantic settings (all env vars)
│   │   │   ├── database.py                # Async SQLAlchemy engine, session, init_db
│   │   │   └── redis.py                   # Async Redis singleton client
│   │   ├── models/                        # SQLModel DB tables
│   │   │   ├── user.py                    # User (phone auth, preferences)
│   │   │   ├── event.py                   # Event (occasion, venue, guests, budget)
│   │   │   └── plan.py                    # Plan (MCP snapshots, timeline, costs, order IDs)
│   │   ├── schemas/                       # Pydantic request/response shapes
│   │   │   ├── event.py                   # EventCreate, EventRead, EventUpdate
│   │   │   └── plan.py                    # PlanRequest, Guest, EventType, VenueMode
│   │   ├── api/v1/
│   │   │   ├── router.py                  # Mounts all endpoint routers
│   │   │   └── endpoints/
│   │   │       ├── events.py              # CRUD: create, list, get, patch, delete
│   │   │       ├── plans.py               # SSE streaming plan generation + chat
│   │   │       ├── users.py               # Auth endpoints (Phase 2)
│   │   │       ├── offers.py              # Live offers fetch
│   │   │       └── orders.py              # Order status tracking (Phase 2)
│   │   ├── services/
│   │   │   ├── mcp/
│   │   │   │   ├── orchestrator.py        # asyncio.gather() across all 3 MCPs
│   │   │   │   ├── food.py                # Swiggy Food MCP client + mocks
│   │   │   │   ├── instamart.py           # Swiggy Instamart MCP client + mocks
│   │   │   │   └── dineout.py             # Swiggy Dineout MCP client + mocks
│   │   │   ├── ai/
│   │   │   │   ├── planner.py             # Claude plan generator (collect + SSE encode)
│   │   │   │   └── prompts.py             # System + user prompt builders
│   │   │   └── offers/
│   │   │       └── engine.py              # Live offer fetch, Redis cache (5min TTL)
│   │   ├── workers/
│   │   │   └── tasks.py                   # Celery async tasks (Phase 2)
│   │   └── utils/
│   │       ├── location.py                # GPS detect, city normalisation
│   │       └── dietary.py                 # Dietary tag helpers
│   ├── tests/
│   │   ├── conftest.py                    # Shared fixtures
│   │   ├── unit/
│   │   │   ├── test_planner.py
│   │   │   └── test_offers.py
│   │   └── integration/
│   │       └── test_mcp.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                   # Home page (two-column layout)
│   │   │   ├── layout.tsx                 # Root layout, metadata
│   │   │   └── globals.css                # Base styles, font imports, CSS vars
│   │   ├── types/
│   │   │   └── index.ts                   # Shared TypeScript types (mirrors backend schemas)
│   │   ├── lib/
│   │   │   ├── api.ts                     # Fetch client, SSE stream consumer
│   │   │   └── parsePlan.ts               # Section marker parser, timeline extractor
│   │   ├── hooks/
│   │   │   └── usePlanStream.ts           # React hook: stream state management
│   │   └── components/
│   │       ├── event/
│   │       │   ├── EventForm.tsx          # Main form (occasion, venue, budget, time)
│   │       │   ├── GuestRoster.tsx        # Named guests + dietary tags, or headcount
│   │       │   └── LocationPicker.tsx     # Text input + GPS detect (Nominatim)
│   │       └── plan/
│   │           ├── PlanStream.tsx         # Main plan renderer (idle/streaming/done/error)
│   │           ├── TimelineCard.tsx       # Evening timeline with connector lines
│   │           ├── DineoutCard.tsx        # Restaurant reservation card
│   │           ├── FoodCard.tsx           # Food delivery options card
│   │           ├── InstamartCard.tsx      # Grocery cart card
│   │           ├── OffersCard.tsx         # Offers + total savings card
│   │           └── CostCard.tsx           # Cost breakdown + total card
│   ├── package.json
│   ├── next.config.js                     # API proxy rewrites to FastAPI
│   ├── tailwind.config.js                 # Custom fonts, colors, animations
│   ├── tsconfig.json                      # Path aliases (@/*)
│   └── postcss.config.js
├── docs/
├── scripts/
│   └── test_api.sh                        # API smoke test
├── .github/
│   └── workflows/
│       └── ci.yml                         # pytest + coverage on push
├── docker-compose.yml
├── CHANGELOG.md
├── .gitignore
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Python 3.12 (via Conda)
- Docker Desktop
- Node.js 20+

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/soiree.git
cd soiree
cp backend/.env.example backend/.env
# Fill in ANTHROPIC_API_KEY in backend/.env
```

### 2. Start Docker services

```bash
docker run -d --name soiree-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=soiree \
  -p 5432:5432 postgres:16-alpine

docker run -d --name soiree-redis \
  -p 6379:6379 redis:7-alpine
```

### 3. Start backend

```bash
cd backend
conda activate soiree
uvicorn app.main:app --reload
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 4. Start frontend

```bash
cd frontend
npm install
npm run dev
# UI running at http://localhost:3000
```

### 5. Verify

```bash
curl http://localhost:8000/health
# {"status": "ok", "service": "soiree-api"}
```

---

## Debugging Guide

| Symptom | Layer | Fix |
|---|---|---|
| App won't start | Config / DB | Check `.env` exists, Docker containers running |
| `422 Unprocessable Entity` | Schema validation | Read error detail — Pydantic tells you which field |
| `404 Not Found` | Routing | Check `router.py` — endpoint mounted? |
| Data not saving | Database | Did you `await session.commit()`? Model imported in `init_db()`? |
| Plan content wrong | MCP mock data | Check `_mock_search_restaurants()` in `food.py` |
| Plan not streaming | Planner / SSE | Check `max_tokens`, SSE headers, `⏎` encoding |
| `MissingGreenlet` error | SQLAlchemy async | Using sync SQLAlchemy code in async context |
| Tables not created | `init_db()` | Model not imported before `create_all()` |

---

## Getting Swiggy MCP Access

1. Apply at [mcp.swiggy.com/builders](https://mcp.swiggy.com/builders)
2. Select Developer track, request all 3 MCP servers
3. Once approved, add to `backend/.env`:
   ```
   SWIGGY_MCP_FOOD_URL=...
   SWIGGY_MCP_INSTAMART_URL=...
   SWIGGY_MCP_DINEOUT_URL=...
   SWIGGY_API_KEY=...
   ```
4. Mock mode switches to live automatically — no code changes needed

---

## Built with

- [Swiggy Builders Club](https://mcp.swiggy.com/builders) — Food, Instamart, Dineout MCP APIs
- [Anthropic Claude](https://anthropic.com) — AI plan generation (claude-sonnet-4-20250514)
- [FastAPI](https://fastapi.tiangolo.com) — Async Python API server
- [SQLModel](https://sqlmodel.tiangolo.com) — Database ORM
- [Next.js](https://nextjs.org) — React frontend framework