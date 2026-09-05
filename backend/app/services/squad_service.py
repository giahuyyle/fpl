from collections import Counter
from random import SystemRandom

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.schema import (
    GameRule,
    Player,
    PlayerSeasonStats,
    Position,
    Squad,
    SquadFavoriteTeam,
    SquadPick,
    Team,
)
from app.models.squad import (
    SquadFavoriteTeamResponse,
    SquadPickResponse,
    SquadProfileUpdate,
    SquadResponse,
    SquadUpsert,
)
from app.services.gameweek_deadline_service import (
    GameweekDeadlineError,
    GameweekDeadlineService,
)
from app.services.fpl_live_service import FPLLiveService
from app.services.player_search_service import PlayerSearchService


class SquadValidationError(ValueError):
    pass


class SquadService:
    def __init__(self, session: Session):
        self._db = session

    def get_squad(self, user_id: int, season_id: int) -> SquadResponse | None:
        squad = self._db.scalar(
            select(Squad).where(
                Squad.user_id == user_id,
                Squad.season_id == season_id,
            )
        )
        if squad is None:
            return None
        return self._response(squad)

    def update_profile(
        self, user_id: int, payload: SquadProfileUpdate
    ) -> SquadResponse:
        rule = self._db.scalar(
            select(GameRule).where(GameRule.season_id == payload.season_id)
        )
        if rule is None:
            raise SquadValidationError("Game rules are unavailable for this season")
        if len(payload.favorite_team_ids) != len(set(payload.favorite_team_ids)):
            raise SquadValidationError("Favorite clubs must be unique")

        favorite_teams = list(
            self._db.scalars(
                select(Team).where(
                    Team.id.in_(payload.favorite_team_ids),
                    Team.season_id == payload.season_id,
                )
            )
        ) if payload.favorite_team_ids else []
        if len(favorite_teams) != len(payload.favorite_team_ids):
            raise SquadValidationError(
                "Every favorite club must belong to this season"
            )

        squad = self._db.scalar(
            select(Squad).where(
                Squad.user_id == user_id,
                Squad.season_id == payload.season_id,
            )
        )
        if squad is None:
            squad = Squad(
                user_id=user_id,
                season_id=payload.season_id,
                name=payload.name,
                badge_style=payload.badge_style,
                is_complete=False,
                bank=rule.budget,
            )
            self._db.add(squad)
            self._db.flush()
        else:
            squad.name = payload.name
            squad.badge_style = payload.badge_style
            self._db.execute(
                delete(SquadFavoriteTeam).where(
                    SquadFavoriteTeam.squad_id == squad.id
                )
            )

        for team_id in payload.favorite_team_ids:
            self._db.add(SquadFavoriteTeam(squad_id=squad.id, team_id=team_id))
        self._db.flush()
        return self._response(squad)

    def upsert_squad(self, user_id: int, payload: SquadUpsert) -> SquadResponse:
        rule = self._db.scalar(
            select(GameRule).where(GameRule.season_id == payload.season_id)
        )
        if rule is None:
            raise SquadValidationError("Game rules are unavailable for this season")
        try:
            GameweekDeadlineService(self._db).editable_gameweek(
                payload.season_id, payload.gameweek_number
            )
        except GameweekDeadlineError as exc:
            raise SquadValidationError(str(exc)) from exc
        # Preserve the in-progress gameweek before replacing SquadPick rows with
        # the user's choices for the next deadline.
        FPLLiveService(self._db).ensure_current_snapshot(
            user_id, payload.season_id
        )
        if len(payload.picks) > rule.squad_size:
            raise SquadValidationError(
                f"A squad may contain at most {rule.squad_size} players"
            )

        squad = self._db.scalar(
            select(Squad).where(
                Squad.user_id == user_id,
                Squad.season_id == payload.season_id,
            )
        )
        existing_picks = (
            list(
                self._db.scalars(
                    select(SquadPick).where(SquadPick.squad_id == squad.id)
                )
            )
            if squad is not None
            else []
        )
        was_complete = bool(squad and squad.is_complete)

        slots = [pick.slot for pick in payload.picks]
        player_ids = [pick.player_id for pick in payload.picks]
        if len(slots) != len(set(slots)):
            raise SquadValidationError("Squad slots must be unique")
        if len(player_ids) != len(set(player_ids)):
            raise SquadValidationError("A player can only be selected once")

        positions = list(
            self._db.scalars(select(Position).order_by(Position.fpl_id, Position.id))
        )
        slot_positions: dict[int, Position] = {}
        next_slot = 1
        for position in positions:
            for slot in range(next_slot, next_slot + position.squad_select):
                slot_positions[slot] = position
            next_slot += position.squad_select

        rows = self._db.execute(
            select(Player, Team, PlayerSeasonStats)
            .join(Team, Player.team_id == Team.id)
            .join(
                PlayerSeasonStats,
                PlayerSeasonStats.player_id == Player.id,
            )
            .where(
                Player.id.in_(player_ids),
                Team.season_id == payload.season_id,
                PlayerSeasonStats.season_id == payload.season_id,
            )
        ).all() if player_ids else []
        players = {player.id: (player, team, stats) for player, team, stats in rows}
        if len(players) != len(player_ids):
            raise SquadValidationError("Every selected player must belong to this season")

        team_counts: Counter[int] = Counter()
        position_counts: Counter[int] = Counter()
        spent = 0
        for pick in payload.picks:
            expected_position = slot_positions.get(pick.slot)
            if expected_position is None:
                raise SquadValidationError(f"Slot {pick.slot} is not configured")
            player, team, stats = players[pick.player_id]
            if not player.can_select or player.removed:
                raise SquadValidationError(f"{player.web_name} is not available for selection")
            if player.position_id != expected_position.id:
                raise SquadValidationError(
                    f"Slot {pick.slot} requires a {expected_position.code}"
                )
            team_counts[team.id] += 1
            position_counts[player.position_id] += 1
            spent += stats.now_cost

        if any(count > rule.max_players_per_team for count in team_counts.values()):
            raise SquadValidationError(
                f"Select no more than {rule.max_players_per_team} players from one club"
            )
        for position in positions:
            if position_counts[position.id] > position.squad_select:
                raise SquadValidationError(
                    f"Too many {position.code} players have been selected"
                )

        is_complete = len(payload.picks) == rule.squad_size
        if was_complete and not is_complete:
            raise SquadValidationError(
                "Transfers must leave a complete squad of 15 players"
            )
        if is_complete:
            for position in positions:
                if position_counts[position.id] != position.squad_select:
                    raise SquadValidationError(
                        f"A complete squad needs {position.squad_select} {position.code} players"
                    )

        existing_purchase_prices = {
            pick.player_id: pick.purchase_price for pick in existing_picks
        }
        if was_complete:
            selected_player_ids = set(player_ids)
            existing_player_ids = set(existing_purchase_prices)
            outgoing_ids = existing_player_ids - selected_player_ids
            incoming_ids = selected_player_ids - existing_player_ids
            outgoing_costs = (
                dict(
                    self._db.execute(
                        select(
                            PlayerSeasonStats.player_id,
                            PlayerSeasonStats.now_cost,
                        ).where(
                            PlayerSeasonStats.season_id == payload.season_id,
                            PlayerSeasonStats.player_id.in_(outgoing_ids),
                        )
                    ).all()
                )
                if outgoing_ids
                else {}
            )
            transfer_budget = squad.bank
            transfer_budget += sum(
                self._selling_price(
                    existing_purchase_prices[player_id],
                    outgoing_costs[player_id],
                    rule.transfer_sell_on_fee,
                    rule.sell_at_purchase_price,
                )
                for player_id in outgoing_ids
            )
            transfer_budget -= sum(
                players[player_id][2].now_cost for player_id in incoming_ids
            )
            if transfer_budget < 0:
                raise SquadValidationError(
                    "The selected players exceed the squad budget"
                )
            next_bank = transfer_budget
        else:
            next_bank = rule.budget - spent
            if next_bank < 0:
                raise SquadValidationError(
                    "The selected players exceed the squad budget"
                )

        if squad is None:
            squad = Squad(
                user_id=user_id,
                season_id=payload.season_id,
                is_complete=is_complete,
                bank=next_bank,
            )
            self._db.add(squad)
            self._db.flush()
        else:
            squad.is_complete = is_complete
            squad.bank = next_bank
            self._db.execute(delete(SquadPick).where(SquadPick.squad_id == squad.id))

        lineup_positions, captain_slot, vice_captain_slot = self._validate_lineup(
            payload,
            players,
            positions,
            is_complete,
            assign_missing_roles=not was_complete,
        )
        for pick in payload.picks:
            _, _, stats = players[pick.player_id]
            self._db.add(
                SquadPick(
                    squad_id=squad.id,
                    player_id=pick.player_id,
                    slot=pick.slot,
                    lineup_position=lineup_positions.get(pick.slot),
                    purchase_price=(
                        existing_purchase_prices.get(pick.player_id, stats.now_cost)
                        if was_complete
                        else stats.now_cost
                    ),
                    is_captain=pick.slot == captain_slot,
                    is_vice_captain=pick.slot == vice_captain_slot,
                )
            )
        self._db.flush()
        return self._response(squad)

    @staticmethod
    def _selling_price(
        purchase_price: int,
        current_price: int,
        sell_on_fee: float,
        sell_at_purchase_price: bool,
    ) -> int:
        if sell_at_purchase_price:
            return purchase_price
        if current_price <= purchase_price:
            return current_price
        retained_profit = int(
            (current_price - purchase_price) * (1 - sell_on_fee)
        )
        return purchase_price + retained_profit

    @classmethod
    def _validate_lineup(
        cls,
        payload: SquadUpsert,
        players: dict[int, tuple[Player, Team, PlayerSeasonStats]],
        positions: list[Position],
        is_complete: bool,
        *,
        assign_missing_roles: bool,
    ) -> tuple[dict[int, int], int | None, int | None]:
        supplied_positions = [
            pick.lineup_position is not None for pick in payload.picks
        ]
        has_roles = any(
            pick.is_captain or pick.is_vice_captain for pick in payload.picks
        )
        if (any(supplied_positions) or has_roles) and not is_complete:
            raise SquadValidationError(
                "Lineup and captain choices require a complete squad"
            )
        if any(supplied_positions) and not all(supplied_positions):
            raise SquadValidationError(
                "Every player needs a lineup position when setting the team"
            )

        if is_complete and all(supplied_positions):
            values = [pick.lineup_position for pick in payload.picks]
            if set(values) != set(range(1, 16)):
                raise SquadValidationError(
                    "Lineup positions must contain every number from 1 to 15"
                )
            lineup_positions = {
                pick.slot: pick.lineup_position for pick in payload.picks
                if pick.lineup_position is not None
            }
        elif is_complete:
            lineup_positions = cls._default_lineup_positions(payload)
        else:
            lineup_positions = {}

        captain_slots = [pick.slot for pick in payload.picks if pick.is_captain]
        vice_captain_slots = [
            pick.slot for pick in payload.picks if pick.is_vice_captain
        ]
        if len(captain_slots) > 1:
            raise SquadValidationError("Select no more than one captain")
        if len(vice_captain_slots) > 1:
            raise SquadValidationError("Select no more than one vice captain")
        if any(pick.is_captain and pick.is_vice_captain for pick in payload.picks):
            raise SquadValidationError(
                "Captain and vice captain must be different players"
            )
        for slot in captain_slots + vice_captain_slots:
            if lineup_positions.get(slot, 99) > 11:
                raise SquadValidationError(
                    "Captain and vice captain must be in the starting XI"
                )

        if is_complete and assign_missing_roles:
            starter_slots = [
                slot for slot, lineup_position in lineup_positions.items()
                if lineup_position <= 11
            ]
            randomizer = SystemRandom()
            if not captain_slots:
                captain_slots = [
                    randomizer.choice(
                        [slot for slot in starter_slots if slot not in vice_captain_slots]
                    )
                ]
            if not vice_captain_slots:
                vice_captain_slots = [
                    randomizer.choice(
                        [slot for slot in starter_slots if slot not in captain_slots]
                    )
                ]

        if is_complete and len(captain_slots) != 1:
            raise SquadValidationError("A complete squad needs one captain")
        if is_complete and len(vice_captain_slots) != 1:
            raise SquadValidationError("A complete squad needs one vice captain")

        if is_complete:
            starter_counts: Counter[int] = Counter(
                players[pick.player_id][0].position_id
                for pick in payload.picks
                if lineup_positions[pick.slot] <= 11
            )
            for position in positions:
                count = starter_counts[position.id]
                if count < position.min_play or count > position.max_play:
                    raise SquadValidationError(
                        f"Starting XI needs between {position.min_play} and "
                        f"{position.max_play} {position.code} players"
                    )
        return (
            lineup_positions,
            captain_slots[0] if captain_slots else None,
            vice_captain_slots[0] if vice_captain_slots else None,
        )

    @staticmethod
    def _default_lineup_positions(payload: SquadUpsert) -> dict[int, int]:
        target = {"GKP": 1, "DEF": 4, "MID": 4, "FWD": 2}
        grouped: dict[str, list[int]] = {code: [] for code in target}
        # Position codes are encoded by the stable slot ranges configured by FPL.
        def slot_code(slot: int) -> str:
            if slot <= 2:
                return "GKP"
            if slot <= 7:
                return "DEF"
            if slot <= 12:
                return "MID"
            return "FWD"

        for pick in sorted(payload.picks, key=lambda item: item.slot):
            grouped[slot_code(pick.slot)].append(pick.slot)

        starters: list[int] = []
        bench: list[int] = []
        for code in ("GKP", "DEF", "MID", "FWD"):
            starters.extend(grouped[code][: target[code]])
            bench.extend(grouped[code][target[code] :])
        ordered = starters + bench
        return {slot: index for index, slot in enumerate(ordered, start=1)}

    def _response(self, squad: Squad) -> SquadResponse:
        rule = self._db.scalar(
            select(GameRule).where(GameRule.season_id == squad.season_id)
        )
        if rule is None:
            raise SquadValidationError("Game rules are unavailable for this season")
        picks = list(
            self._db.scalars(
                select(SquadPick)
                .where(SquadPick.squad_id == squad.id)
                .order_by(SquadPick.slot)
            )
        )
        player_items = PlayerSearchService(self._db).get_items(
            squad.season_id, [pick.player_id for pick in picks]
        )
        favorite_teams = list(
            self._db.scalars(
                select(Team)
                .join(SquadFavoriteTeam, SquadFavoriteTeam.team_id == Team.id)
                .where(SquadFavoriteTeam.squad_id == squad.id)
                .order_by(Team.name)
            )
        )
        spent = sum(pick.purchase_price for pick in picks)
        return SquadResponse(
            id=squad.id,
            user_id=squad.user_id,
            season_id=squad.season_id,
            name=squad.name,
            badge_style=squad.badge_style,
            is_complete=squad.is_complete,
            spent=spent,
            budget=rule.budget,
            remaining_budget=squad.bank,
            created_at=squad.created_at,
            updated_at=squad.updated_at,
            favorite_teams=[
                SquadFavoriteTeamResponse(
                    id=team.id,
                    name=team.name,
                    short_name=team.short_name,
                    code=team.code,
                )
                for team in favorite_teams
            ],
            picks=[
                SquadPickResponse(
                    id=pick.id,
                    slot=pick.slot,
                    lineup_position=pick.lineup_position,
                    purchase_price=pick.purchase_price,
                    selling_price=self._selling_price(
                        pick.purchase_price,
                        player_items[pick.player_id].stats.now_cost,
                        rule.transfer_sell_on_fee,
                        rule.sell_at_purchase_price,
                    ),
                    is_captain=pick.is_captain,
                    is_vice_captain=pick.is_vice_captain,
                    player=player_items[pick.player_id],
                )
                for pick in picks
            ],
        )
