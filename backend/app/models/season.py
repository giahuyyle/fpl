from datetime import date
from typing import Any

from pydantic import model_validator


from app.models.base import ORMResponseModel, RequestModel


class SeasonCreate(RequestModel):
    name: str
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool = False


class SeasonUpdate(RequestModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_null_for_required_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for field in ("name", "is_current"):
                if field in data and data[field] is None:
                    raise ValueError(f"{field} cannot be null")
        return data


class SeasonResponse(ORMResponseModel):
    id: int
    name: str
    start_date: date | None
    end_date: date | None
    is_current: bool
