from datetime import datetime

from app.models.base import ORMResponseModel


class FixtureTeamResponse(ORMResponseModel):
    id: int
    fpl_id: int
    code: int
    name: str
    short_name: str


class FixtureResponse(ORMResponseModel):
    id: int
    fpl_id: int
    gameweek_id: int | None
    home_team: FixtureTeamResponse
    away_team: FixtureTeamResponse
    home_score: int | None
    away_score: int | None
    kickoff_time: datetime | None
    started: bool
    finished: bool
    finished_provisional: bool
    minutes: int
    home_difficulty: int | None
    away_difficulty: int | None

