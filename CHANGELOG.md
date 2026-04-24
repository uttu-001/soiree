# Changelog

All notable changes to Soirée will be documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [0.1.0] — 2026-04-24

### Added
- Project scaffold — full directory structure (backend, frontend, docs, scripts)
- `README.md` — full product plan, architecture, data flow, tech stack, setup guide
- `.gitignore` — Python, Node, Docker, IDE, env file exclusions
- `.env.example` — all required environment variables documented
- `docker-compose.yml` — local dev stack (FastAPI + Celery + Postgres + Redis + Next.js)
- `.github/workflows/ci.yml` — GitHub Actions CI with pytest + coverage

### Backend — Core
- `backend/app/main.py` — FastAPI app, lifespan context manager, CORS middleware, health endpoint
- `backend/app/core/config.py` — Pydantic settings, all env vars centralised
- `backend/app/core/database.py` — async SQLAlchemy engine, session factory, `init_db()`
- `backend/app/core/redis.py` — async Redis client, singleton pattern, `get_redis()`, `close_redis()`

### Backend — Models
- `backend/app/models/user.py` — User table (phone auth, preferences, dietary tags)
- `backend/app/models/event.py` — Event table (EventType, VenueMode, EventStatus enums, guest roster, location, budget)
- `backend/app/models/plan.py` — Plan table (PlanStatus state machine, MCP data snapshots, cost breakdown, order confirmations)

### Backend — API Stubs
- `backend/app/api/v1/router.py` — API router stub
- `backend/app/api/v1/endpoints/` — empty stubs for plans, events, users, offers, orders

### Infrastructure
- Docker: `soiree-postgres` (PostgreSQL 16) and `soiree-redis` (Redis 7) containers
- Conda env `soiree` with Python 3.12
- All three DB tables verified live in Postgres: `users`, `events`, `plans`
- Server boots clean at `http://localhost:8000`
- API docs live at `http://localhost:8000/docs`

---

## Versioning Strategy

- `0.x.0` — Phase 1 milestones (core features)
- `0.x.x` — incremental additions within a phase
- `1.0.0` — Phase 1 complete (plan & present)
- `2.0.0` — Phase 2 complete (agentic ordering)
- `3.0.0` — Phase 3 complete (corporate + social)