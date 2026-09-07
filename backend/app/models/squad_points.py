from app.models.base import ORMResponseModel
from app.models.gameweek import GameweekResponse
from app.models.player_search import PlayerSearchItem


class PointsBreakdownItem(ORMResponseModel):
    statistic: str
    value: int
    points: int


class ScoredPickResponse(ORMResponseModel):
    player_id: int
    slot: int
    lineup_position: int
    played: bool
    points: int
    multiplier: int
    effective_points: int
    was_auto_subbed: bool
    is_captain: bool
    is_vice_captain: bool
    points_breakdown: list[PointsBreakdownItem]
    player: PlayerSearchItem


class SquadPointsResponse(ORMResponseModel):
    gameweek: GameweekResponse
    has_snapshot: bool
    is_backfilled: bool
    provisional: bool
    average_points: int
    highest_points: int | None
    points: int
    transfer_cost: int
    total_points: int
    gameweek_rank: int | None
    overall_rank: int | None
    total_squads: int
    transfers: int
    free_transfers: int
    next_free_transfers: int
    points_on_bench: int
    picks: list[ScoredPickResponse]
