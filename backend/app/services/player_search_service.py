from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.db.schema import Player, PlayerSeasonStats, Position, Team
from app.models.player_search import (
    PlayerPositionSummary,
    PlayerSearchItem,
    PlayerSearchRequest,
    PlayerSearchResponse,
    PlayerTeamSummary,
)
from app.models.player_season_stats import PlayerSeasonStatsResponse


class InvalidSearchFieldError(ValueError):
    pass


STAT_FIELDS = {
    column.name: getattr(PlayerSeasonStats, column.name)
    for column in PlayerSeasonStats.__table__.columns
    if column.name not in {"id", "player_id", "season_id"}
}

SORT_FIELDS = {
    **STAT_FIELDS,
    "web_name": Player.web_name,
    "team": Team.name,
    "position": Position.fpl_id,
}


class PlayerSearchService:
    def __init__(self, session: Session):
        self._db = session

    def search(self, payload: PlayerSearchRequest) -> PlayerSearchResponse:
        conditions = [
            Team.season_id == payload.season_id,
            PlayerSeasonStats.season_id == payload.season_id,
            Player.can_select.is_(True),
            Player.removed.is_(False),
        ]
        if payload.query and payload.query.strip():
            pattern = f"%{payload.query.strip()}%"
            conditions.append(
                or_(
                    Player.first_name.ilike(pattern),
                    Player.last_name.ilike(pattern),
                    Player.known_name.ilike(pattern),
                    Player.web_name.ilike(pattern),
                )
            )
        if payload.team_ids:
            conditions.append(Player.team_id.in_(payload.team_ids))
        if payload.position_ids:
            conditions.append(Player.position_id.in_(payload.position_ids))

        for stat_filter in payload.filters:
            column = STAT_FIELDS.get(stat_filter.field)
            if column is None:
                raise InvalidSearchFieldError(
                    f"Unsupported player statistic: {stat_filter.field}"
                )
            if stat_filter.minimum is not None:
                conditions.append(column >= stat_filter.minimum)
            if stat_filter.maximum is not None:
                conditions.append(column <= stat_filter.maximum)

        sort_column = SORT_FIELDS.get(payload.sort_by)
        if sort_column is None:
            raise InvalidSearchFieldError(
                f"Unsupported player sort: {payload.sort_by}"
            )
        direction = sort_column.asc if payload.sort_direction == "asc" else sort_column.desc

        base = self._base_statement().where(*conditions)
        total = self._db.scalar(
            select(func.count()).select_from(Player)
            .join(Team, Player.team_id == Team.id)
            .join(Position, Player.position_id == Position.id)
            .join(PlayerSeasonStats, PlayerSeasonStats.player_id == Player.id)
            .where(*conditions)
        )
        rows = self._db.execute(
            base.order_by(direction(), Player.web_name, Player.id)
            .offset(payload.offset)
            .limit(payload.limit)
        ).all()
        return PlayerSearchResponse(
            total=total or 0,
            items=[self._to_item(*row) for row in rows],
        )

    def get_items(
        self, season_id: int, player_ids: list[int]
    ) -> dict[int, PlayerSearchItem]:
        if not player_ids:
            return {}
        rows = self._db.execute(
            self._base_statement().where(
                Team.season_id == season_id,
                PlayerSeasonStats.season_id == season_id,
                Player.id.in_(player_ids),
            )
        ).all()
        return {player.id: self._to_item(player, team, position, stats) for player, team, position, stats in rows}

    @staticmethod
    def _base_statement() -> Select:
        return (
            select(Player, Team, Position, PlayerSeasonStats)
            .join(Team, Player.team_id == Team.id)
            .join(Position, Player.position_id == Position.id)
            .join(PlayerSeasonStats, PlayerSeasonStats.player_id == Player.id)
        )

    @staticmethod
    def _to_item(
        player: Player,
        team: Team,
        position: Position,
        stats: PlayerSeasonStats,
    ) -> PlayerSearchItem:
        return PlayerSearchItem(
            id=player.id,
            fpl_id=player.fpl_id,
            first_name=player.first_name,
            last_name=player.last_name,
            web_name=player.web_name,
            photo=player.photo,
            status=player.status,
            can_select=player.can_select,
            team=PlayerTeamSummary.model_validate(team),
            position=PlayerPositionSummary.model_validate(position),
            stats=PlayerSeasonStatsResponse.model_validate(stats),
        )
