from typing import Any

from pydantic import model_validator

from app.models.base import ORMResponseModel, RequestModel


class ScoringRuleCreate(RequestModel):
    season_id: int
    stat: str
    position_id: int | None = None
    points: int


class ScoringRuleUpdate(RequestModel):
    points: int | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_null(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("points", ...) is None:
            raise ValueError("points cannot be null")
        return data


class ScoringRuleResponse(ORMResponseModel):
    id: int
    season_id: int
    stat: str
    position_id: int | None
    points: int
