from fastapi import FastAPI

from app.api.v1 import api_router

app = FastAPI()

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
