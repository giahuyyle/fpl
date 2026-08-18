from app.models.base import ORMResponseModel


class PhaseResponse(ORMResponseModel):
    id: int
    fpl_id: int
    season_id: int
    name: str
    start_gameweek_id: int
    end_gameweek_id: int
    highest_score: int | None
