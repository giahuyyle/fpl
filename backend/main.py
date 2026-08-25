from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.auth.v1 import auth_router
from app.core.config import config

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins,
    allow_credentials=True,
    allow_headers="*",  # allow all headers
    allow_methods="*",  # allow all methods
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/auth/v1")


@app.get("/health")
def read_root():
    return {"status": "ok"}
