from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import Phase


class PhaseService:
    def __init__(self, session: Session):
        self._db = session

    def get_phase(self, phase_id: int) -> Phase | None:
        return self._db.get(Phase, phase_id)

    def list_phases(self, season_id: int) -> list[Phase]:
        statement = (
            select(Phase)
            .where(Phase.season_id == season_id)
            .order_by(Phase.fpl_id)
        )
        return list(self._db.scalars(statement))
