from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import Position


class PositionService:
    def __init__(self, session: Session):
        self._db = session

    def get_position(self, position_id: int) -> Position | None:
        return self._db.get(Position, position_id)

    def list_positions(self) -> list[Position]:
        statement = select(Position).order_by(Position.fpl_id)
        return list(self._db.scalars(statement))
