from typing import Literal, Self

from pydantic import Field, model_validator

from app.models.base import ORMResponseModel, RequestModel
from app.models.player_season_stats import PlayerSeasonStatsResponse


class PlayerStatFilter(RequestModel):
    field: str = Field(min_length=1, max_length=64)
    minimum: float | None = None
    maximum: float | None = None

    @model_validator(mode="after")
    def validate_range(self) -> Self:
        if self.minimum is None and self.maximum is None:
            raise ValueError("a minimum or maximum is required")
        if (
            self.minimum is not None
            and self.maximum is not None
            and self.minimum > self.maximum
        ):
            raise ValueError("minimum cannot exceed maximum")
        return self


class PlayerSearchRequest(RequestModel):
    season_id: int
    query: str | None = Field(default=None, max_length=100)
    team_ids: list[int] = Field(default_factory=list)
    position_ids: list[int] = Field(default_factory=list)
    filters: list[PlayerStatFilter] = Field(default_factory=list, max_length=12)
    sort_by: str = Field(default="now_cost", min_length=1, max_length=64)
    sort_direction: Literal["asc", "desc"] = "desc"
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=100)


class PlayerTeamSummary(ORMResponseModel):
    id: int
    name: str
    short_name: str
    code: int


class PlayerPositionSummary(ORMResponseModel):
    id: int
    code: str
    name: str


class PlayerSearchItem(ORMResponseModel):
    id: int
    fpl_id: int
    first_name: str
    last_name: str
    web_name: str
    photo: str | None
    status: str
    can_select: bool
    team: PlayerTeamSummary
    position: PlayerPositionSummary
    stats: PlayerSeasonStatsResponse


class PlayerSearchResponse(ORMResponseModel):
    total: int
    items: list[PlayerSearchItem]
