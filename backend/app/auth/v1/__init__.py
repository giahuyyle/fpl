from fastapi import APIRouter
from app.auth.v1.authentication import router as authentication_router

auth_router = APIRouter()
auth_router.include_router(authentication_router)
