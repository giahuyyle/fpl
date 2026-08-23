from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router

app = FastAPI()

origins = [
    "http://localhost:5173",   # react vite default
    #"https://your-frontend-domain.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_headers="*",  # allow all headers
    allow_methods="*",  # allow all methods
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def read_root():
    return {"status": "ok"}