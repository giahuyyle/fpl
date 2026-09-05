from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.db.schema import Fixture, Gameweek, Team
from app.models.fixture import FixtureResponse, FixtureTeamResponse


class FixtureService:
    def __init__(self, session: Session):
        self._db = session

    def list_fixtures(
        self, season_id: int, gameweek_number: int | None = None
    ) -> list[FixtureResponse]:
        home = aliased(Team)
        away = aliased(Team)
        statement = (
            select(Fixture, home, away)
            .join(home, home.id == Fixture.home_team_id)
            .join(away, away.id == Fixture.away_team_id)
            .outerjoin(Gameweek, Gameweek.id == Fixture.gameweek_id)
            .where(Fixture.season_id == season_id)
            .order_by(Fixture.kickoff_time, Fixture.id)
        )
        if gameweek_number is not None:
            statement = statement.where(Gameweek.number == gameweek_number)
        return [
            FixtureResponse(
                id=fixture.id,
                fpl_id=fixture.fpl_id,
                gameweek_id=fixture.gameweek_id,
                home_team=FixtureTeamResponse.model_validate(home_team),
                away_team=FixtureTeamResponse.model_validate(away_team),
                home_score=fixture.home_score,
                away_score=fixture.away_score,
                kickoff_time=fixture.kickoff_time,
                started=fixture.started,
                finished=fixture.finished,
                finished_provisional=fixture.finished_provisional,
                minutes=fixture.minutes,
                home_difficulty=fixture.home_difficulty,
                away_difficulty=fixture.away_difficulty,
            )
            for fixture, home_team, away_team in self._db.execute(statement).all()
        ]
