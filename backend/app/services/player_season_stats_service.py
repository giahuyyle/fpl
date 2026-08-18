from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import PlayerSeasonStats
from app.services.pagination import validate_pagination


class PlayerSeasonStatsService:
    def __init__(self, session: Session):
        self._db = session

    def get_player_season_stats(
        self, player_id: int, season_id: int
    ) -> PlayerSeasonStats | None:
        statement = select(PlayerSeasonStats).where(
            PlayerSeasonStats.player_id == player_id,
            PlayerSeasonStats.season_id == season_id,
        )
        return self._db.scalar(statement)

    def list_player_season_stats(
        self, season_id: int, *, offset: int = 0, limit: int = 100
    ) -> list[PlayerSeasonStats]:
        validate_pagination(offset, limit)
        statement = (
            select(PlayerSeasonStats)
            .where(PlayerSeasonStats.season_id == season_id)
            .order_by(PlayerSeasonStats.total_points.desc(), PlayerSeasonStats.player_id)
            .offset(offset)
            .limit(limit)
        )
        return list(self._db.scalars(statement))
