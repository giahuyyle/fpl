from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

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


@app.get("/")
def welcome():
    return {"message": "Welcome to FPL API"}


@app.get("/health")
def read_root():
    return {"status": "ok"}


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            return await super().get_response("index.html", scope)


static_directory = Path(__file__).parent / "static"

if static_directory.exists():
    app.mount(
        "/",
        SPAStaticFiles(directory=static_directory, html=True),
        name="frontend",
    )
