from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import (
    Chip,
    Fixture,
    GameRule,
    Gameweek,
    Player,
    PlayerGameweekStats,
    PlayerSeasonStats,
    Position,
    Squad,
    SquadGameweek,
    SquadGameweekPick,
    SquadPick,
    Team,
    UserChip,
)


PLAYER_STAT_FIELDS = (
    "starts",
    "goals_scored",
    "assists",
    "clean_sheets",
    "goals_conceded",
    "own_goals",
    "penalties_saved",
    "penalties_missed",
    "yellow_cards",
    "red_cards",
    "saves",
    "bonus",
    "bps",
    "defensive_contribution",
)


class FPLLiveService:
    """Persist official fixture/event payloads and score saved squad snapshots."""

    def __init__(self, session: Session):
        self._db = session

    def sync_fixtures(self, season_id: int, payload: list[dict[str, Any]]) -> int:
        teams = {
            team.fpl_id: team
            for team in self._db.scalars(
                select(Team).where(Team.season_id == season_id)
            )
        }
        gameweeks = {
            gameweek.fpl_id: gameweek
            for gameweek in self._db.scalars(
                select(Gameweek).where(Gameweek.season_id == season_id)
            )
        }
        existing = {
            fixture.fpl_id: fixture
            for fixture in self._db.scalars(
                select(Fixture).where(Fixture.season_id == season_id)
            )
        }
        synced = 0
        for item in payload:
            home = teams.get(item.get("team_h"))
            away = teams.get(item.get("team_a"))
            if home is None or away is None:
                continue
            fixture = existing.get(item["id"])
            if fixture is None:
                fixture = Fixture(
                    fpl_id=item["id"],
                    code=item.get("code", item["id"]),
                    season_id=season_id,
                    home_team_id=home.id,
                    away_team_id=away.id,
                )
                self._db.add(fixture)
                existing[item["id"]] = fixture
            fixture.code = item.get("code", fixture.code)
            fixture.gameweek_id = (
                gameweeks[item["event"]].id
                if item.get("event") in gameweeks
                else None
            )
            fixture.home_team_id = home.id
            fixture.away_team_id = away.id
            fixture.home_score = item.get("team_h_score")
            fixture.away_score = item.get("team_a_score")
            fixture.kickoff_time = self._parse_datetime(item.get("kickoff_time"))
            fixture.started = bool(item.get("started", False))
            fixture.finished = bool(item.get("finished", False))
            fixture.finished_provisional = bool(
                item.get("finished_provisional", False)
            )
            fixture.minutes = int(item.get("minutes") or 0)
            fixture.home_difficulty = item.get("team_h_difficulty")
            fixture.away_difficulty = item.get("team_a_difficulty")
            fixture.pulse_id = item.get("pulse_id")
            synced += 1
        self._db.flush()
        return synced

    def sync_player_gameweek(
        self,
        season_id: int,
        gameweek_number: int,
        payload: dict[str, Any],
    ) -> int:
        gameweek = self._db.scalar(
            select(Gameweek).where(
                Gameweek.season_id == season_id,
                Gameweek.number == gameweek_number,
            )
        )
        if gameweek is None:
            raise ValueError(f"Gameweek {gameweek_number} is not available")
        players = {
            player.fpl_id: player
            for player in self._db.scalars(
                select(Player)
                .join(Team, Team.id == Player.team_id)
                .where(Team.season_id == season_id)
            )
        }
        existing = {
            stats.player_id: stats
            for stats in self._db.scalars(
                select(PlayerGameweekStats).where(
                    PlayerGameweekStats.gameweek_id == gameweek.id
                )
            )
        }
        synced = 0
        for item in payload.get("elements", []):
            player = players.get(item.get("id"))
            if player is None:
                continue
            values = item.get("stats", {})
            stats = existing.get(player.id)
            if stats is None:
                stats = PlayerGameweekStats(
                    player_id=player.id,
                    gameweek_id=gameweek.id,
                )
                self._db.add(stats)
                existing[player.id] = stats
            stats.total_points = int(values.get("total_points") or 0)
            stats.minutes = int(values.get("minutes") or 0)
            stats.played = bool(values.get("played") or stats.minutes > 0)
            stats.in_dreamteam = bool(values.get("in_dreamteam", False))
            for field in PLAYER_STAT_FIELDS:
                setattr(stats, field, int(values.get(field) or 0))
            synced += 1
        self._db.flush()
        self.score_gameweek(gameweek)
        return synced

    def create_due_snapshots(self, season_id: int) -> int:
        """Create deadline snapshots and the explicitly requested GW1/GW2 backfill.

        GW1 and GW2 use the current complete squad as a synthetic verification
        snapshot. A still-active gameweek may also be recovered after the normal
        deadline window; completed historical weeks are never reconstructed.
        """
        now = datetime.now(timezone.utc)
        gameweeks = list(
            self._db.scalars(
                select(Gameweek)
                .where(
                    Gameweek.season_id == season_id,
                    Gameweek.deadline_time <= now.replace(tzinfo=None),
                )
                .order_by(Gameweek.number)
            )
        )
        created = 0
        for gameweek in gameweeks:
            deadline = gameweek.deadline_time
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            is_backfill = gameweek.number <= 2
            if (
                not is_backfill
                and gameweek.finished
                and now - deadline > timedelta(minutes=10)
            ):
                continue
            created += self._snapshot_complete_squads(gameweek, is_backfill)
            self.score_gameweek(gameweek)
        return created

    def ensure_current_snapshot(self, user_id: int, season_id: int) -> int:
        """Recover a missing snapshot for the gameweek currently in progress.

        The deadline worker remains the normal snapshot path. This guard covers
        restarts or database resets after the deadline and runs before the user
        can save changes for the following gameweek.
        """
        gameweek = self._db.scalar(
            select(Gameweek)
            .where(
                Gameweek.season_id == season_id,
                Gameweek.deadline_time <= datetime.now(timezone.utc).replace(
                    tzinfo=None
                ),
                Gameweek.finished.is_(False),
            )
            .order_by(Gameweek.number.desc())
            .limit(1)
        )
        squad = self._db.scalar(
            select(Squad).where(
                Squad.user_id == user_id,
                Squad.season_id == season_id,
                Squad.is_complete.is_(True),
            )
        )
        if gameweek is None or squad is None:
            return 0
        created = self._snapshot_complete_squads(
            gameweek,
            is_backfill=False,
            squad_id=squad.id,
        )
        if created:
            self.score_gameweek(gameweek)
        return created

    def score_gameweek(self, gameweek: Gameweek) -> int:
        stats_by_player = {
            stats.player_id: stats
            for stats in self._db.scalars(
                select(PlayerGameweekStats).where(
                    PlayerGameweekStats.gameweek_id == gameweek.id
                )
            )
        }
        positions = {
            player_id: (code, min_play, max_play)
            for player_id, code, min_play, max_play in self._db.execute(
                select(Player.id, Position.code, Position.min_play, Position.max_play)
                .join(Position, Position.id == Player.position_id)
            )
        }
        snapshots = list(
            self._db.scalars(
                select(SquadGameweek).where(
                    SquadGameweek.gameweek_id == gameweek.id
                )
            )
        )
        chip_names = dict(self._db.execute(select(Chip.id, Chip.name)).all())
        finalized = bool(gameweek.finished and gameweek.data_checked)
        for snapshot in snapshots:
            picks = list(
                self._db.scalars(
                    select(SquadGameweekPick)
                    .where(SquadGameweekPick.squad_gameweek_id == snapshot.id)
                    .order_by(SquadGameweekPick.lineup_position)
                )
            )
            self._score_picks(
                snapshot,
                picks,
                stats_by_player,
                positions,
                chip_names.get(snapshot.active_chip_id),
                finalized=finalized,
            )
            snapshot.finalized = finalized
        self._recalculate_totals_and_ranks(gameweek.season_id)
        self._db.flush()
        return len(snapshots)

    def _snapshot_complete_squads(
        self,
        gameweek: Gameweek,
        is_backfill: bool,
        squad_id: int | None = None,
    ) -> int:
        squad_filters = [
            Squad.season_id == gameweek.season_id,
            Squad.is_complete.is_(True),
        ]
        if squad_id is not None:
            squad_filters.append(Squad.id == squad_id)
        squads = list(
            self._db.scalars(
                select(Squad).where(*squad_filters)
            )
        )
        existing_squad_ids = set(
            self._db.scalars(
                select(SquadGameweek.squad_id).where(
                    SquadGameweek.gameweek_id == gameweek.id
                )
            )
        )
        created = 0
        for squad in squads:
            if squad.id in existing_squad_ids:
                continue
            picks = list(
                self._db.scalars(
                    select(SquadPick)
                    .where(SquadPick.squad_id == squad.id)
                    .order_by(SquadPick.lineup_position, SquadPick.slot)
                )
            )
            if len(picks) != 15 or any(pick.lineup_position is None for pick in picks):
                continue
            current_prices = dict(
                self._db.execute(
                    select(PlayerSeasonStats.player_id, PlayerSeasonStats.now_cost)
                    .where(
                        PlayerSeasonStats.season_id == gameweek.season_id,
                        PlayerSeasonStats.player_id.in_([pick.player_id for pick in picks]),
                    )
                ).all()
            )
            active_chip = None
            if not is_backfill:
                active_chip = self._db.scalar(
                    select(UserChip).where(
                        UserChip.user_id == squad.user_id,
                        UserChip.status == "active",
                    )
                )
            previous = self._db.scalar(
                select(SquadGameweek)
                .join(Gameweek, Gameweek.id == SquadGameweek.gameweek_id)
                .where(
                    SquadGameweek.squad_id == squad.id,
                    Gameweek.number < gameweek.number,
                )
                .order_by(Gameweek.number.desc())
                .limit(1)
            )
            transfers_made = 0
            free_transfers = 1
            if previous is not None:
                previous_gameweek_number = self._db.scalar(
                    select(Gameweek.number).where(
                        Gameweek.id == previous.gameweek_id
                    )
                ) or gameweek.number - 1
                free_transfers = min(
                    self._free_transfer_cap(gameweek.season_id),
                    previous.free_transfers_after
                    + max(0, gameweek.number - previous_gameweek_number - 1),
                )
                if not is_backfill:
                    previous_players = set(
                        self._db.scalars(
                            select(SquadGameweekPick.player_id).where(
                                SquadGameweekPick.squad_gameweek_id == previous.id
                            )
                        )
                    )
                    transfers_made = len(
                        {pick.player_id for pick in picks} - previous_players
                    )
            chip_name = None
            if active_chip is not None:
                chip_name = self._db.scalar(
                    select(Chip.name).where(Chip.id == active_chip.chip_id)
                )
            no_hit = chip_name in {"wildcard", "freehit"}
            transfer_cost = (
                0 if no_hit else max(0, transfers_made - free_transfers) * 4
            )
            free_transfers_after = (
                free_transfers
                if no_hit
                else min(
                    self._free_transfer_cap(gameweek.season_id),
                    max(0, free_transfers - transfers_made) + 1,
                )
            )
            snapshot = SquadGameweek(
                squad_id=squad.id,
                gameweek_id=gameweek.id,
                active_chip_id=active_chip.chip_id if active_chip else None,
                is_backfilled=is_backfill,
                finalized=False,
                bank=squad.bank,
                squad_value=sum(
                    current_prices.get(pick.player_id, pick.purchase_price)
                    for pick in picks
                ),
                transfers_made=transfers_made,
                transfer_cost=transfer_cost,
                free_transfers=free_transfers,
                free_transfers_after=free_transfers_after,
            )
            self._db.add(snapshot)
            self._db.flush()
            for pick in picks:
                self._db.add(
                    SquadGameweekPick(
                        squad_gameweek_id=snapshot.id,
                        player_id=pick.player_id,
                        slot=pick.slot,
                        lineup_position=pick.lineup_position,
                        purchase_price=pick.purchase_price,
                        is_captain=pick.is_captain,
                        is_vice_captain=pick.is_vice_captain,
                    )
                )
            if active_chip is not None:
                active_chip.status = "used"
                active_chip.used_at = gameweek.deadline_time
            created += 1
        self._db.flush()
        return created

    def _free_transfer_cap(self, season_id: int) -> int:
        maximum_extra = self._db.scalar(
            select(GameRule.max_extra_free_transfers).where(
                GameRule.season_id == season_id
            )
        )
        return (maximum_extra if maximum_extra is not None else 4) + 1

    @staticmethod
    def _score_picks(
        snapshot: SquadGameweek,
        picks: list[SquadGameweekPick],
        stats_by_player: dict[int, PlayerGameweekStats],
        positions: dict[int, tuple[str, int, int]],
        chip_name: str | None,
        *,
        finalized: bool = True,
    ) -> None:
        for pick in picks:
            stats = stats_by_player.get(pick.player_id)
            pick.points = stats.total_points if stats and stats.played else 0
            pick.multiplier = 1 if pick.lineup_position <= 11 else 0
            pick.was_auto_subbed = False

        if chip_name == "bboost":
            for pick in picks:
                pick.multiplier = 1
        elif finalized:
            starters = [pick for pick in picks if pick.lineup_position <= 11]
            bench = [pick for pick in picks if pick.lineup_position > 11]
            playing_ids = {
                player_id for player_id, stats in stats_by_player.items() if stats.played
            }
            active_starters = [pick for pick in starters if pick.player_id in playing_ids]
            formation = Counter(positions[pick.player_id][0] for pick in active_starters)
            used: set[int] = set()
            for outgoing in [pick for pick in starters if pick.player_id not in playing_ids]:
                outgoing_code = positions[outgoing.player_id][0]
                candidates = [
                    pick
                    for pick in bench
                    if pick.player_id in playing_ids
                    and pick.player_id not in used
                    and (
                        positions[pick.player_id][0] == "GKP"
                        if outgoing_code == "GKP"
                        else positions[pick.player_id][0] != "GKP"
                    )
                ]
                replacement = next(
                    (
                        candidate
                        for candidate in candidates
                        if FPLLiveService._valid_formation_after(
                            formation, positions[candidate.player_id]
                        )
                    ),
                    None,
                )
                if replacement is None:
                    continue
                replacement.multiplier = 1
                replacement.was_auto_subbed = True
                outgoing.multiplier = 0
                outgoing.was_auto_subbed = True
                used.add(replacement.player_id)
                formation[positions[replacement.player_id][0]] += 1

        captain = next((pick for pick in picks if pick.is_captain), None)
        vice = next((pick for pick in picks if pick.is_vice_captain), None)
        captain_multiplier = 3 if chip_name == "3xc" else 2
        if captain and captain.multiplier > 0 and (
            not finalized
            or (
                stats_by_player.get(captain.player_id, None)
                and stats_by_player[captain.player_id].played
            )
        ):
            captain.multiplier = captain_multiplier
        elif vice and vice.multiplier > 0 and (
            stats_by_player.get(vice.player_id, None)
            and stats_by_player[vice.player_id].played
        ):
            vice.multiplier = captain_multiplier

        for pick in picks:
            pick.effective_points = pick.points * pick.multiplier
        snapshot.points = sum(pick.effective_points for pick in picks)
        snapshot.points_on_bench = sum(
            pick.points for pick in picks if pick.lineup_position > 11
        )

    @staticmethod
    def _valid_formation_after(
        formation: Counter[str], candidate: tuple[str, int, int]
    ) -> bool:
        code, _minimum, maximum = candidate
        if formation[code] + 1 > maximum:
            return False
        next_formation = formation.copy()
        next_formation[code] += 1
        # A partially filled XI may be below a minimum while several substitutions
        # are still pending; make sure enough remaining slots exist to recover.
        remaining = 11 - sum(next_formation.values())
        minimums = {"GKP": 1, "DEF": 3, "MID": 2, "FWD": 1}
        deficit = sum(max(0, value - next_formation[key]) for key, value in minimums.items())
        return deficit <= remaining

    def _recalculate_totals_and_ranks(self, season_id: int) -> None:
        snapshots = list(
            self._db.scalars(
                select(SquadGameweek)
                .join(Gameweek, Gameweek.id == SquadGameweek.gameweek_id)
                .where(Gameweek.season_id == season_id)
                .order_by(SquadGameweek.squad_id, Gameweek.number)
            )
        )
        running: dict[int, int] = {}
        by_gameweek: dict[int, list[SquadGameweek]] = {}
        for snapshot in snapshots:
            total = running.get(snapshot.squad_id, 0)
            total += snapshot.points - snapshot.transfer_cost
            snapshot.total_points = total
            running[snapshot.squad_id] = total
            by_gameweek.setdefault(snapshot.gameweek_id, []).append(snapshot)
        for items in by_gameweek.values():
            previous = None
            previous_rank = 0
            for index, snapshot in enumerate(
                sorted(items, key=lambda item: (-item.points, item.id)), start=1
            ):
                if snapshot.points != previous:
                    previous_rank = index
                    previous = snapshot.points
                snapshot.gameweek_rank = previous_rank
            previous = None
            previous_rank = 0
            for index, snapshot in enumerate(
                sorted(items, key=lambda item: (-item.total_points, item.id)), start=1
            ):
                if snapshot.total_points != previous:
                    previous_rank = index
                    previous = snapshot.total_points
                snapshot.overall_rank = previous_rank

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime | None:
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
