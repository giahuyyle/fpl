from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.schema import (
    Gameweek,
    PlayerGameweekStats,
    Squad,
    SquadGameweek,
    SquadGameweekPick,
)
from app.models.gameweek import GameweekResponse
from app.models.squad_points import ScoredPickResponse, SquadPointsResponse
from app.services.fpl_live_service import FPLLiveService
from app.services.gameweek_deadline_service import utc_now_naive
from app.services.player_search_service import PlayerSearchService


class SquadPointsService:
    def __init__(self, session: Session):
        self._db = session

    def get_points(
        self, user_id: int, season_id: int, gameweek_number: int | None = None
    ) -> SquadPointsResponse | None:
        FPLLiveService(self._db).ensure_current_snapshot(user_id, season_id)
        return self._get_points(user_id, season_id, gameweek_number)

    def _get_points(
        self, user_id: int, season_id: int, gameweek_number: int | None = None
    ) -> SquadPointsResponse | None:
        visible_gameweek = or_(
            Gameweek.finished.is_(True),
            Gameweek.deadline_time <= utc_now_naive(),
        )
        if gameweek_number is None:
            gameweek = self._db.scalar(
                select(Gameweek)
                .where(Gameweek.season_id == season_id, visible_gameweek)
                .order_by(Gameweek.number.desc())
                .limit(1)
            )
        else:
            gameweek = self._db.scalar(
                select(Gameweek).where(
                    Gameweek.season_id == season_id,
                    Gameweek.number == gameweek_number,
                    visible_gameweek,
                )
            )
        if gameweek is None:
            return None
        squad = self._db.scalar(
            select(Squad).where(
                Squad.user_id == user_id,
                Squad.season_id == season_id,
            )
        )
        snapshot = None
        if squad is not None:
            snapshot = self._db.scalar(
                select(SquadGameweek).where(
                    SquadGameweek.squad_id == squad.id,
                    SquadGameweek.gameweek_id == gameweek.id,
                )
            )
        picks = []
        if snapshot is not None:
            picks = list(
                self._db.scalars(
                    select(SquadGameweekPick)
                    .where(SquadGameweekPick.squad_gameweek_id == snapshot.id)
                    .order_by(SquadGameweekPick.lineup_position)
                )
            )
        player_items = PlayerSearchService(self._db).get_items(
            season_id, [pick.player_id for pick in picks]
        )
        played_by_player = dict(
            self._db.execute(
                select(PlayerGameweekStats.player_id, PlayerGameweekStats.played).where(
                    PlayerGameweekStats.gameweek_id == gameweek.id,
                    PlayerGameweekStats.player_id.in_(
                        [pick.player_id for pick in picks]
                    ),
                )
            ).all()
        )
        total_squads = self._db.scalar(
            select(func.count(SquadGameweek.id)).where(
                SquadGameweek.gameweek_id == gameweek.id
            )
        ) or 0
        return SquadPointsResponse(
            gameweek=GameweekResponse.model_validate(gameweek),
            has_snapshot=snapshot is not None,
            is_backfilled=snapshot.is_backfilled if snapshot else False,
            provisional=not snapshot.finalized if snapshot else not gameweek.data_checked,
            average_points=gameweek.average_score,
            highest_points=gameweek.highest_score,
            points=snapshot.points if snapshot else 0,
            transfer_cost=snapshot.transfer_cost if snapshot else 0,
            total_points=snapshot.total_points if snapshot else 0,
            gameweek_rank=snapshot.gameweek_rank if snapshot else None,
            overall_rank=snapshot.overall_rank if snapshot else None,
            total_squads=total_squads,
            transfers=snapshot.transfers_made if snapshot else 0,
            free_transfers=snapshot.free_transfers if snapshot else 1,
            next_free_transfers=snapshot.free_transfers_after if snapshot else 1,
            points_on_bench=snapshot.points_on_bench if snapshot else 0,
            picks=[
                ScoredPickResponse(
                    player_id=pick.player_id,
                    slot=pick.slot,
                    lineup_position=pick.lineup_position,
                    played=played_by_player.get(pick.player_id, False),
                    points=pick.points,
                    multiplier=pick.multiplier,
                    effective_points=pick.effective_points,
                    was_auto_subbed=pick.was_auto_subbed,
                    is_captain=pick.is_captain,
                    is_vice_captain=pick.is_vice_captain,
                    player=player_items[pick.player_id],
                )
                for pick in picks
            ],
        )

    def list_points(self, user_id: int, season_id: int) -> list[SquadPointsResponse]:
        FPLLiveService(self._db).ensure_current_snapshot(user_id, season_id)
        numbers = list(
            self._db.scalars(
                select(Gameweek.number)
                .where(
                    Gameweek.season_id == season_id,
                    Gameweek.released.is_(True),
                    or_(
                        Gameweek.finished.is_(True),
                        Gameweek.deadline_time <= utc_now_naive(),
                    ),
                )
                .order_by(Gameweek.number)
            )
        )
        return [
            result
            for number in numbers
            if (result := self._get_points(user_id, season_id, number)) is not None
        ]
