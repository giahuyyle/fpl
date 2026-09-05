from datetime import datetime

from pydantic import Field

from app.models.base import ORMResponseModel, RequestModel
from app.models.player_search import PlayerSearchItem


class SquadPickInput(RequestModel):
    slot: int = Field(ge=1, le=15)
    player_id: int
    lineup_position: int | None = Field(default=None, ge=1, le=15)
    is_captain: bool = False
    is_vice_captain: bool = False


class SquadUpsert(RequestModel):
    season_id: int
    picks: list[SquadPickInput] = Field(default_factory=list, max_length=15)


class SquadPickResponse(ORMResponseModel):
    id: int
    slot: int
    lineup_position: int | None
    purchase_price: int
    selling_price: int
    is_captain: bool
    is_vice_captain: bool
    player: PlayerSearchItem


class SquadResponse(ORMResponseModel):
    id: int
    user_id: int
    season_id: int
    is_complete: bool
    spent: int
    budget: int
    remaining_budget: int
    created_at: datetime
    updated_at: datetime
    picks: list[SquadPickResponse]
