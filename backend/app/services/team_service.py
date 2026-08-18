from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import Team


class TeamService:
    def __init__(self, session: Session):
        self._db = session

    def get_team(self, team_id: int) -> Team | None:
        return self._db.get(Team, team_id)

    def list_teams(self, season_id: int) -> list[Team]:
        statement = (
            select(Team)
            .where(Team.season_id == season_id)
            .order_by(Team.position, Team.name)
        )
        return list(self._db.scalars(statement))
