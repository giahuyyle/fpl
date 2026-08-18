from app.models.base import ORMResponseModel


class TeamResponse(ORMResponseModel):
    id: int
    fpl_id: int
    season_id: int
    code: int
    name: str
    short_name: str
    played: int
    wins: int
    draws: int
    losses: int
    points: int
    position: int
    strength: int | None
    strength_overall_home: int
    strength_overall_away: int
    strength_attack_home: int
    strength_attack_away: int
    strength_defence_home: int
    strength_defence_away: int
    unavailable: bool
