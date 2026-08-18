from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import Chip


class ChipService:
    def __init__(self, session: Session):
        self._db = session

    def get_chip(self, chip_id: int) -> Chip | None:
        return self._db.get(Chip, chip_id)

    def list_chips(self, season_id: int) -> list[Chip]:
        statement = (
            select(Chip)
            .where(Chip.season_id == season_id)
            .order_by(Chip.fpl_id)
        )
        return list(self._db.scalars(statement))
