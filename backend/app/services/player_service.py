from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.schema import Player, Team
from app.services.pagination import validate_pagination


class PlayerService:
    def __init__(self, session: Session):
        self._db = session

    def get_player(self, player_id: int) -> Player | None:
        return self._db.get(Player, player_id)

    def list_players(
        self,
        *,
        season_id: int | None = None,
        team_id: int | None = None,
        position_id: int | None = None,
        status: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 100,
    ) -> list[Player]:
        validate_pagination(offset, limit)
        statement = select(Player)

        if season_id is not None:
            statement = statement.join(Team, Player.team_id == Team.id).where(
                Team.season_id == season_id
            )
        if team_id is not None:
            statement = statement.where(Player.team_id == team_id)
        if position_id is not None:
            statement = statement.where(Player.position_id == position_id)
        if status is not None:
            statement = statement.where(Player.status == status)
        if search is not None and search.strip():
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    Player.first_name.ilike(pattern),
                    Player.last_name.ilike(pattern),
                    Player.known_name.ilike(pattern),
                    Player.web_name.ilike(pattern),
                )
            )

        statement = statement.order_by(Player.web_name, Player.id).offset(offset).limit(limit)
        return list(self._db.scalars(statement))
