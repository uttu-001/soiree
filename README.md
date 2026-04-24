# Soirée — Life Events Concierge

> AI-powered event planning built on Swiggy's MCP platform (Food · Instamart · Dineout).
> Plan a date night, house party, corporate dinner, or birthday — then approve and let the agent place every order.

---

## What is Soirée?

Soirée is a full-stack AI concierge that orchestrates your entire event experience using Swiggy's three live MCP APIs. You describe your event — who, what, where, budget — and the AI generates a complete plan: restaurant booking, food delivery picks, and grocery cart, all stitched into a minute-by-minute evening timeline.

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

## Features

### Phase 1 — Plan & Present (Weeks 1–6)
- **Event setup** — 6 occasion types: Date / Friends Night / Birthday / Corporate / House Party / Family Dinner
- **Guest roster** — add named guests with per-person dietary tags, or just set a headcount
- **Location picker** — GPS detect or city/area text search, anchors all Swiggy API calls
- **Venue mode** — Dine Out (Dineout only) / Stay In (Food + Instamart) / Hybrid (full arc)
- **Health context** — per-guest dietary flags (Veg, Vegan, Keto, Jain, Gluten-Free, Halal, No-Nuts) + group wellness slider
- **AI plan generation** — streams a complete plan: evening timeline, Dineout recommendation + slot, food delivery options, Instamart cart
- **Offer & discount engine** — surfaces live Swiggy offers, bank card discounts, Instamart combos; validates at checkout
- **Plan editor** — swap restaurants, adjust items, regenerate sections via chat

### Phase 2 — Approve & Order (Weeks 7–12)
- **One-tap autonomous ordering** — agent calls `place_food_order` + `checkout` + `book_table` after approval
- **Live order tracking** — unified status across all 3 Swiggy services
- **Shareable plan card** — public link with timeline + RSVP for guests
- **User memory** — learns cuisine preferences, dietary flags, favourite venues across events
- **Native mobile app** — React Native

### Phase 3 — Scale (Weeks 13–20)
- **Group consensus mode** — guests submit preferences via link; AI finds the menu that satisfies the most constraints
- **Slack / Teams bot** — `/soiree lunch 12 people` → bot collects preferences, generates plan, places order
- **Corporate billing** — GST receipts, expense-friendly output
- **Multi-city support**, repeat event templates, analytics dashboard

---

## Architecture

### Data Flow

```
User input (event config)
        │
        ▼
  Context builder
  (event_type, guests, location, dietary, budget, start_time)
        │
        ▼
  AI Planner (Claude claude-sonnet-4-20250514)
        │
        ├──── asyncio.gather() ────────────────────────┐
        │                                              │
   Swiggy Food MCP          Swiggy Instamart MCP   Swiggy Dineout MCP
   search_restaurants       search_products         search_restaurants_dineout
   get_restaurant_menu      update_cart             get_available_slots
        │                        │                      │
        └──────────── results merged ──────────────────┘
        │
        ▼
  Offer engine (live offers fetched, never cached stale)
        │
        ▼
  Streaming plan response (SSE → frontend)
  ┌─ Evening timeline
  ├─ Dineout card (restaurant + slot)
  ├─ Food delivery picks (3 options)
  ├─ Instamart cart (itemised)
  ├─ Health & dietary insight
  └─ Total cost breakdown + active offers
        │
        ▼
  User reviews + edits plan
        │
        ▼
  One-tap approval → Order agent
        │
        ├── place_food_order (Food MCP)
        ├── checkout (Instamart MCP)
        └── book_table (Dineout MCP)
        │
        ▼
  Live confirmations (all 3 services)
```

### The `asyncio.gather()` Pattern

The core performance win. All three Swiggy MCP calls fire in parallel, not sequentially:

```python
# services/mcp/orchestrator.py
results = await asyncio.gather(
    food_client.search_restaurants(...),
    instamart_client.search_products(...),
    dineout_client.search_restaurants(...),
    return_exceptions=True,   # degrade gracefully per service
)
```

Serial calls would cost 3× the latency. This is non-negotiable at plan generation time.

---

## Tech Stack

### Backend (Python-first)

| Layer | Technology | Why |
|---|---|---|
| API server | **FastAPI** | Async-native, perfect for concurrent MCP calls, Pydantic built-in |
| AI + MCP | **Anthropic Python SDK** + `mcp` SDK | Native tool chaining, streaming, MCP server connections |
| Database | **PostgreSQL** + **SQLModel** | SQLAlchemy + Pydantic fused — no schema duplication |
| Migrations | **Alembic** | Standard for SQLAlchemy projects |
| Cache + sessions | **Redis** | Offer TTLs, JWT sessions, Celery broker |
| Background jobs | **Celery** | Async ordering, offer refresh, preference aggregation |
| Auth | **FastAPI-Users** + **MSG91 OTP** | Phone OTP — India-first auth |
| Validation | **Pydantic v2** | MCP response models, request validation |
| HTTP client | **httpx** | Async-compatible, used for MCP + external API calls |
| Testing | **pytest** + **pytest-asyncio** + **respx** | Mock MCP responses in tests, never hit live APIs in CI |

### Frontend

| Layer | Technology |
|---|---|
| Web | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Mobile (Phase 2) | React Native |

### Infra

| Layer | Technology |
|---|---|
| Local dev | Docker + docker-compose (API + Celery + Redis + Postgres in one command) |
| API hosting | Railway |
| Frontend hosting | Vercel |
| Database | Supabase (managed Postgres + Redis) |
| CI/CD | GitHub Actions |

---

## Project Structure

```
soiree/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, lifespan, CORS
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic settings (all env vars)
│   │   │   ├── database.py            # SQLModel async engine
│   │   │   └── redis.py               # Redis connection pool
│   │   ├── models/                    # SQLModel DB models
│   │   │   ├── user.py
│   │   │   ├── event.py
│   │   │   └── plan.py
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── event.py
│   │   │   └── plan.py                # PlanRequest, Guest, EventType enums
│   │   ├── api/v1/
│   │   │   ├── router.py              # Mounts all endpoint routers
│   │   │   └── endpoints/
│   │   │       ├── users.py           # Auth, profile
│   │   │       ├── events.py          # Event CRUD
│   │   │       ├── plans.py           # Plan generation (SSE stream) + order
│   │   │       ├── offers.py          # Live offers fetch
│   │   │       └── orders.py          # Order status tracking
│   │   ├── services/
│   │   │   ├── mcp/
│   │   │   │   ├── orchestrator.py    # asyncio.gather() across all 3 MCPs
│   │   │   │   ├── food.py            # Swiggy Food MCP client
│   │   │   │   ├── instamart.py       # Swiggy Instamart MCP client
│   │   │   │   └── dineout.py         # Swiggy Dineout MCP client
│   │   │   ├── ai/
│   │   │   │   ├── planner.py         # Claude streaming plan generation
│   │   │   │   └── prompts.py         # System + user prompt builders
│   │   │   └── offers/
│   │   │       └── engine.py          # Live offer fetch + discount logic
│   │   ├── workers/
│   │   │   └── tasks.py               # Celery async tasks
│   │   └── utils/
│   │       ├── location.py            # GPS detect, city normalisation
│   │       └── dietary.py             # Dietary tag helpers
│   ├── tests/
│   │   ├── conftest.py                # Shared fixtures (test DB, mock MCP)
│   │   ├── unit/
│   │   │   ├── test_planner.py        # AI planner unit tests
│   │   │   └── test_offers.py         # Offer engine tests
│   │   └── integration/
│   │       └── test_mcp.py            # MCP client integration tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   ├── components/                # UI components
│   │   ├── lib/                       # API client, utils
│   │   └── hooks/                     # Custom React hooks
│   └── public/
├── docs/
│   ├── api.md                         # API reference
│   ├── mcp-integration.md             # Swiggy MCP setup guide
│   └── deployment.md                  # Prod deployment guide
├── scripts/
│   ├── setup.sh                       # First-time local setup
│   └── seed.py                        # DB seed data
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pytest + coverage on push
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Key Design Decisions

### 1. AI handles reasoning, MCP handles data
All restaurant names, prices, slots, and products come from live Swiggy MCP calls. Claude handles tone, sequencing, and plan structure only. This prevents hallucinated restaurant names — a real trust-breaker.

### 2. Streaming plan response (SSE)
Plan generation streams token-by-token from Claude via Server-Sent Events. The frontend renders the plan as it arrives — no waiting for a full JSON response. FastAPI + `StreamingResponse` handles this natively.

### 3. Offers fetched live, validated at checkout
Offers are fetched at plan generation time with their expiry shown. They're re-validated at checkout before any order is placed. Never cached stale.

### 4. Mandatory confirmation before any autonomous order
The order agent (Phase 2) always surfaces a confirmation screen before calling any Swiggy order API. One-step undo available for 60 seconds post-order via Swiggy cancel API.

### 5. Per-guest dietary tags drive menu filtering
Named guests can have individual dietary restrictions. The AI intersects all constraints and filters menus accordingly. For headcount-only events, group-level tags apply to all.

---

## Local Development Setup

### Prerequisites
- Python 3.12+
- Docker + docker-compose
- Node.js 20+ (frontend)

### 1. Clone and set up environment

```bash
git clone https://github.com/YOUR_USERNAME/soiree.git
cd soiree
cp backend/.env.example backend/.env
# Fill in ANTHROPIC_API_KEY and SWIGGY_* keys in backend/.env
```

### 2. Start all services

```bash
docker-compose up -d
```

This starts: FastAPI (8000) · Celery worker · PostgreSQL (5432) · Redis (6379) · Next.js (3000)

### 3. Run migrations

```bash
cd backend
alembic upgrade head
```

### 4. Verify

```bash
curl http://localhost:8000/health
# {"status": "ok", "service": "soiree-api"}
```

API docs available at: `http://localhost:8000/docs`

### 5. Run tests

```bash
cd backend
pytest tests/ --cov=app -v
```

---

## Getting Swiggy MCP Access

1. Apply at [mcp.swiggy.com/builders](https://mcp.swiggy.com/builders)
2. Describe your use case (life events concierge using all 3 MCP servers)
3. Receive API keys and MCP server URLs
4. Add to `backend/.env`:
   ```
   SWIGGY_MCP_FOOD_URL=...
   SWIGGY_MCP_INSTAMART_URL=...
   SWIGGY_MCP_DINEOUT_URL=...
   SWIGGY_API_KEY=...
   ```

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Swiggy MCP rate limits | High | Cache restaurant/menu data per city (1hr TTL). Batch Instamart lookups. Degrade gracefully with AI-only suggestions if throttled. |
| Agentic order errors | High | Mandatory confirmation screen. 60s undo window. Dry-run mode before Phase 2 goes live. |
| Offer data staleness | Medium | Fetched live at generation. Expiry shown on every badge. Re-validated at checkout. |
| Dineout slot gone by checkout | Medium | Show 3 restaurant options with pre-fetched slots. AI auto-suggests next available time if preferred slot gone. |
| AI hallucinating restaurants | Low | All names/prices come from MCP data. Claude never invents food data. |

---

## Roadmap

- [ ] Phase 1: MVP — event setup, guest roster, location, AI plan generation, offer engine
- [ ] Phase 2: Agentic ordering, shareable plan card, user memory, mobile app
- [ ] Phase 3: Group consensus mode, Slack bot, corporate billing, multi-city

---

## Built with

- [Swiggy Builders Club](https://mcp.swiggy.com/builders) — Food, Instamart, Dineout MCP APIs
- [Anthropic Claude](https://anthropic.com) — AI plan generation and order orchestration
- [FastAPI](https://fastapi.tiangolo.com) — Async Python API server
- [SQLModel](https://sqlmodel.tiangolo.com) — Database ORM