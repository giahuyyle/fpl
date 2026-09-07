from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.schema import (
    Gameweek,
    PlayerGameweekStats,
    ScoringRule,
    Squad,
    SquadGameweek,
    SquadGameweekPick,
)
from app.models.gameweek import GameweekResponse
from app.models.squad_points import (
    PointsBreakdownItem,
    ScoredPickResponse,
    SquadPointsResponse,
)
from app.services.fpl_live_service import FPLLiveService
from app.services.gameweek_deadline_service import utc_now_naive
from app.services.player_search_service import PlayerSearchService


class SquadPointsService:
    def __init__(self, session: Session):
        self._db = session

    @staticmethod
    def _points_breakdown(
        stats: PlayerGameweekStats | None,
        position_id: int,
        position_code: str,
        rules: dict[tuple[str, int | None], int],
    ) -> list[PointsBreakdownItem]:
        if stats is None or not stats.played:
            return []

        defaults: dict[str, int] = {
            "long_play": 2,
            "short_play": 1,
            "goals_scored": {
                "GKP": 10,
                "DEF": 6,
                "MID": 5,
                "FWD": 4,
            }.get(position_code, 0),
            "assists": 3,
            "clean_sheets": {
                "GKP": 4,
                "DEF": 4,
                "MID": 1,
                "FWD": 0,
            }.get(position_code, 0),
            "goals_conceded": -1 if position_code in {"GKP", "DEF"} else 0,
            "own_goals": -2,
            "penalties_saved": 5,
            "penalties_missed": -2,
            "yellow_cards": -1,
            "red_cards": -3,
            "saves": 1,
            "bonus": 1,
            "defensive_contribution": 2 if position_code != "GKP" else 0,
        }

        def rule(stat: str) -> int:
            return rules.get(
                (stat, position_id),
                rules.get((stat, None), defaults.get(stat, 0)),
            )

        items: list[PointsBreakdownItem] = []

        def add(statistic: str, value: int, points: int) -> None:
            if value and points:
                items.append(
                    PointsBreakdownItem(
                        statistic=statistic,
                        value=value,
                        points=points,
                    )
                )

        appearance_points = (
            rule("long_play") if stats.minutes >= 60 else rule("short_play")
        )
        add("Minutes played", stats.minutes, appearance_points)
        add(
            "Goals scored",
            stats.goals_scored,
            stats.goals_scored * rule("goals_scored"),
        )
        add("Assists", stats.assists, stats.assists * rule("assists"))
        add(
            "Clean sheets",
            stats.clean_sheets,
            stats.clean_sheets * rule("clean_sheets"),
        )
        add(
            "Goals conceded",
            stats.goals_conceded,
            (stats.goals_conceded // 2) * rule("goals_conceded"),
        )
        add("Own goals", stats.own_goals, stats.own_goals * rule("own_goals"))
        add(
            "Penalties saved",
            stats.penalties_saved,
            stats.penalties_saved * rule("penalties_saved"),
        )
        add(
            "Penalties missed",
            stats.penalties_missed,
            stats.penalties_missed * rule("penalties_missed"),
        )
        add(
            "Yellow cards",
            stats.yellow_cards,
            stats.yellow_cards * rule("yellow_cards"),
        )
        add("Red cards", stats.red_cards, stats.red_cards * rule("red_cards"))
        add("Saves", stats.saves, (stats.saves // 3) * rule("saves"))
        add("Bonus", stats.bonus, stats.bonus * rule("bonus"))
        contribution_threshold = 10 if position_code == "DEF" else 12
        if stats.defensive_contribution >= contribution_threshold:
            add(
                "Defensive contributions",
                stats.defensive_contribution,
                rule("defensive_contribution"),
            )

        explained_points = sum(item.points for item in items)
        if adjustment := stats.total_points - explained_points:
            add("Other adjustments", 1, adjustment)
        return items

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
        stats_by_player = {
            stats.player_id: stats
            for stats in self._db.scalars(
                select(PlayerGameweekStats).where(
                    PlayerGameweekStats.gameweek_id == gameweek.id,
                    PlayerGameweekStats.player_id.in_(
                        [pick.player_id for pick in picks]
                    ),
                )
            )
        }
        scoring_rules = {
            (item.stat, item.position_id): item.points
            for item in self._db.scalars(
                select(ScoringRule).where(ScoringRule.season_id == season_id)
            )
        }
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
                    played=(stats := stats_by_player.get(pick.player_id)) is not None
                    and stats.played,
                    points=pick.points if stats is not None and stats.played else 0,
                    multiplier=pick.multiplier,
                    effective_points=(
                        pick.effective_points
                        if stats is not None and stats.played
                        else 0
                    ),
                    was_auto_subbed=pick.was_auto_subbed,
                    is_captain=pick.is_captain,
                    is_vice_captain=pick.is_vice_captain,
                    points_breakdown=self._points_breakdown(
                        stats,
                        player_items[pick.player_id].position.id,
                        player_items[pick.player_id].position.code,
                        scoring_rules,
                    ),
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
