from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

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
    gameweek_number: int | None = Field(default=None, ge=1, le=38)
    picks: list[SquadPickInput] = Field(default_factory=list, max_length=15)


class SquadProfileUpdate(RequestModel):
    season_id: int
    name: str = Field(min_length=1, max_length=50)
    badge_style: Literal[
        "classic-purple",
        "pink-purple",
        "cyan-purple",
        "green-navy",
    ]
    favorite_team_ids: list[int] = Field(default_factory=list, max_length=3)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Squad name cannot be blank")
        return value


class SquadFavoriteTeamResponse(ORMResponseModel):
    id: int
    name: str
    short_name: str
    code: int


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
    name: str
    badge_style: str
    is_complete: bool
    spent: int
    budget: int
    remaining_budget: int
    created_at: datetime
    updated_at: datetime
    favorite_teams: list[SquadFavoriteTeamResponse]
    picks: list[SquadPickResponse]
