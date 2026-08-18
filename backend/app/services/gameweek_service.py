from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import Gameweek


class GameweekService:
    def __init__(self, session: Session):
        self._db = session

    def get_gameweek(self, gameweek_id: int) -> Gameweek | None:
        return self._db.get(Gameweek, gameweek_id)

    def get_gameweek_by_number(
        self, season_id: int, number: int
    ) -> Gameweek | None:
        statement = select(Gameweek).where(
            Gameweek.season_id == season_id,
            Gameweek.number == number,
        )
        return self._db.scalar(statement)

    def list_gameweeks(self, season_id: int) -> list[Gameweek]:
        statement = (
            select(Gameweek)
            .where(Gameweek.season_id == season_id)
            .order_by(Gameweek.number)
        )
        return list(self._db.scalars(statement))
