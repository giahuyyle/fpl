from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import Season
from app.models import SeasonCreate, SeasonUpdate


class SeasonService:
    """Manage seasons while leaving commit and rollback to the caller."""

    def __init__(self, session: Session):
        self._db = session

    def list_seasons(self) -> list[Season]:
        statement = select(Season).order_by(Season.id)
        return list(self._db.scalars(statement))

    def get_season(self, season_id: int) -> Season | None:
        return self._db.get(Season, season_id)

    def get_current_season(self) -> Season | None:
        statement = (
            select(Season)
            .where(Season.is_current.is_(True))
            .order_by(Season.id.desc())
            .limit(1)
        )
        return self._db.scalar(statement)

    def create_season(self, payload: SeasonCreate) -> Season:
        season = Season(**payload.model_dump())
        self._db.add(season)
        self._db.flush()
        self._db.refresh(season)
        return season

    def update_season(
        self, season_id: int, payload: SeasonUpdate
    ) -> Season | None:
        season = self.get_season(season_id)
        if season is None:
            return None

        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(season, field, value)

        self._db.flush()
        self._db.refresh(season)
        return season
