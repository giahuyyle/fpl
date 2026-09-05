from typing import Literal

from app.models.base import ORMResponseModel, RequestModel


class ChipResponse(ORMResponseModel):
    id: int
    fpl_id: int
    season_id: int
    name: str
    number: int
    chip_type: str
    start_gameweek_id: int
    end_gameweek_id: int


class UserChipStateResponse(ChipResponse):
    status: Literal["available", "active", "unavailable"]


class ActiveChipUpdate(RequestModel):
    season_id: int
    chip_id: int | None
