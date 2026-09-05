from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.schema import Gameweek


class GameweekDeadlineError(ValueError):
    pass


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class GameweekDeadlineService:
    def __init__(self, session: Session):
        self._db = session

    def editable_gameweek(
        self, season_id: int, gameweek_number: int | None = None
    ) -> Gameweek | None:
        now = utc_now_naive()
        if gameweek_number is not None:
            gameweek = self._db.scalar(
                select(Gameweek).where(
                    Gameweek.season_id == season_id,
                    Gameweek.number == gameweek_number,
                )
            )
            if gameweek is None:
                raise GameweekDeadlineError(
                    f"Gameweek {gameweek_number} is unavailable"
                )
            if gameweek.deadline_time <= now:
                raise GameweekDeadlineError(
                    f"The {gameweek.name} deadline has passed"
                )
            return gameweek

        gameweek = self._db.scalar(
            select(Gameweek)
            .where(
                Gameweek.season_id == season_id,
                Gameweek.deadline_time > now,
            )
            .order_by(Gameweek.number)
            .limit(1)
        )
        if gameweek is not None:
            return gameweek

        gameweek_count = self._db.scalar(
            select(func.count(Gameweek.id)).where(Gameweek.season_id == season_id)
        ) or 0
        if gameweek_count:
            raise GameweekDeadlineError(
                "Squad changes are unavailable because every gameweek deadline has passed"
            )
        return None
