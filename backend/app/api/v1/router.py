from fastapi import APIRouter

api_router = APIRouter()

# Endpoints will be mounted here as we build them
# from app.api.v1.endpoints import events, plans, users, offers, orders
# api_router.include_router(plans.router, prefix="/plans", tags=["plans"])