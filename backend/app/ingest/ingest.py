from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.schema import (
    Chip,
    GameRule,
    Gameweek,
    Phase,
    Player,
    PlayerSeasonStats,
    Position,
    ScoringRule,
    Season,
    Team,
)
from app.ingest.load_fpl_bootstrap_data import load_fpl_bootstrap_data


def _parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    # The FPL API uses UTC timestamps while the schema stores naive datetimes.
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def _optional_float(value: str | float | int | None) -> float | None:
    return float(value) if value is not None else None


def ingest_season(session: Session) -> Season:
    """
    Create/Update so that 2026/27 is the only current season in DB
    """
    season = session.scalar(
        select(Season).where(Season.name == "2026/27")
    )

    if season is None:
        season = Season(name="2026/27")
        session.add(season)

    # Ensure only this season is current.
    other_seasons = session.scalars(
        select(Season).where(Season.name != "2026/27")
    ).all()

    for other_season in other_seasons:
        other_season.is_current = False

    season.start_date = date(2026, 8, 21)
    season.end_date = date(2027, 5, 30)
    season.is_current = True

    session.flush()
    return season


def ingest_positions(
    session: Session,
    positions_data: list[dict[str, Any]],
) -> list[Position]:
    """Create or update player positions from FPL element type data.

    Commit and rollback are left to the caller.
    """
    existing_positions = session.scalars(select(Position)).all()
    positions_by_fpl_id = {
        position.fpl_id: position for position in existing_positions
    }

    ingested_positions: list[Position] = []

    for position_data in positions_data:
        fpl_id = position_data["id"]
        position = positions_by_fpl_id.get(fpl_id)

        if position is None:
            position = Position(fpl_id=fpl_id)
            session.add(position)
            positions_by_fpl_id[fpl_id] = position

        position.code = position_data["singular_name_short"]
        position.name = position_data["singular_name"]
        position.squad_select = position_data["squad_select"]
        position.min_play = position_data["squad_min_play"]
        position.max_play = position_data["squad_max_play"]
        ingested_positions.append(position)

    session.flush()
    return ingested_positions


def ingest_teams(
    session: Session,
    season_id: int,
    teams_data: list[dict[str, Any]],
) -> list[Team]:
    """Create or update teams for a season from FPL bootstrap data.

    Commit and rollback are left to the caller.
    """
    existing_teams = session.scalars(
        select(Team).where(Team.season_id == season_id)
    ).all()
    teams_by_fpl_id = {team.fpl_id: team for team in existing_teams}

    ingested_teams: list[Team] = []

    for team_data in teams_data:
        fpl_id = team_data["id"]
        team = teams_by_fpl_id.get(fpl_id)

        if team is None:
            team = Team(fpl_id=fpl_id, season_id=season_id)
            session.add(team)
            teams_by_fpl_id[fpl_id] = team

        team.code = team_data["code"]
        team.name = team_data["name"]
        team.short_name = team_data["short_name"]
        team.played = team_data["played"]
        team.wins = team_data["win"]
        team.draws = team_data["draw"]
        team.losses = team_data["loss"]
        team.points = team_data["points"]
        team.position = team_data["position"]
        team.strength = team_data["strength"]
        team.strength_overall_home = team_data["strength_overall_home"]
        team.strength_overall_away = team_data["strength_overall_away"]
        team.strength_attack_home = team_data["strength_attack_home"]
        team.strength_attack_away = team_data["strength_attack_away"]
        team.strength_defence_home = team_data["strength_defence_home"]
        team.strength_defence_away = team_data["strength_defence_away"]
        team.unavailable = team_data["unavailable"]
        ingested_teams.append(team)

    session.flush()
    return ingested_teams


def ingest_players(
    session: Session,
    season_id: int,
    players_data: list[dict[str, Any]],
) -> list[Player]:
    """Create or update players and resolve their team and position IDs."""
    teams = session.scalars(
        select(Team).where(Team.season_id == season_id)
    ).all()
    teams_by_fpl_id = {team.fpl_id: team for team in teams}
    positions_by_fpl_id = {
        position.fpl_id: position
        for position in session.scalars(select(Position)).all()
    }
    players_by_fpl_id = {
        player.fpl_id: player
        for player in session.scalars(select(Player)).all()
    }

    ingested_players: list[Player] = []

    for player_data in players_data:
        fpl_id = player_data["id"]

        try:
            team = teams_by_fpl_id[player_data["team"]]
            position = positions_by_fpl_id[player_data["element_type"]]
        except KeyError as error:
            raise ValueError(
                f"Missing team or position with FPL ID {error.args[0]} "
                f"while ingesting player {fpl_id}"
            ) from error

        player = players_by_fpl_id.get(fpl_id)
        if player is None:
            player = Player(fpl_id=fpl_id)
            session.add(player)
            players_by_fpl_id[fpl_id] = player

        player.code = player_data["code"]
        player.opta_code = player_data["opta_code"] or None
        player.first_name = player_data["first_name"]
        player.last_name = player_data["second_name"]
        player.known_name = player_data["known_name"] or None
        player.web_name = player_data["web_name"]
        player.birth_date = _parse_date(player_data["birth_date"])
        player.region = player_data["region"]
        player.photo = player_data["photo"] or None
        player.team_id = team.id
        player.position_id = position.id
        player.squad_number = player_data["squad_number"]
        player.team_join_date = _parse_date(player_data["team_join_date"])
        player.status = player_data["status"]
        player.can_select = player_data["can_select"]
        player.can_transact = player_data["can_transact"]
        player.removed = player_data["removed"]
        ingested_players.append(player)

    session.flush()
    return ingested_players


def ingest_player_season_stats(
    session: Session,
    season_id: int,
    players_data: list[dict[str, Any]],
) -> list[PlayerSeasonStats]:
    """Create or update season statistics from the FPL element payload."""
    players_by_fpl_id = {
        player.fpl_id: player
        for player in session.scalars(select(Player)).all()
    }
    existing_stats = session.scalars(
        select(PlayerSeasonStats).where(
            PlayerSeasonStats.season_id == season_id
        )
    ).all()
    stats_by_player_id = {stats.player_id: stats for stats in existing_stats}

    ingested_stats: list[PlayerSeasonStats] = []

    for player_data in players_data:
        fpl_id = player_data["id"]
        player = players_by_fpl_id.get(fpl_id)
        if player is None:
            raise ValueError(f"Player {fpl_id} has not been ingested")

        stats = stats_by_player_id.get(player.id)
        if stats is None:
            stats = PlayerSeasonStats(player_id=player.id, season_id=season_id)
            session.add(stats)
            stats_by_player_id[player.id] = stats

        integer_fields = (
            "minutes",
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
            "clearances_blocks_interceptions",
            "recoveries",
            "tackles",
            "defensive_contribution",
            "total_points",
            "now_cost",
            "transfers_in",
            "transfers_out",
            "transfers_in_event",
            "transfers_out_event",
            "event_points",
            "dreamteam_count",
        )
        float_fields = (
            "influence",
            "creativity",
            "threat",
            "ict_index",
            "expected_goals",
            "expected_assists",
            "expected_goal_involvements",
            "expected_goals_conceded",
            "points_per_game",
            "form",
            "selected_by_percent",
            "value_form",
            "value_season",
        )

        for field in integer_fields:
            setattr(stats, field, player_data[field])
        for field in float_fields:
            setattr(stats, field, float(player_data[field]))

        stats.chance_of_playing_next_round = player_data[
            "chance_of_playing_next_round"
        ]
        stats.chance_of_playing_this_round = player_data[
            "chance_of_playing_this_round"
        ]
        stats.ep_next = _optional_float(player_data["ep_next"])
        stats.ep_this = _optional_float(player_data["ep_this"])
        stats.in_dreamteam = player_data["in_dreamteam"]
        ingested_stats.append(stats)

    session.flush()
    return ingested_stats


def ingest_gameweeks(
    session: Session,
    season_id: int,
    gameweeks_data: list[dict[str, Any]],
) -> list[Gameweek]:
    """Create or update gameweeks and resolve optional player references."""
    players_by_fpl_id = {
        player.fpl_id: player
        for player in session.scalars(select(Player)).all()
    }
    existing_gameweeks = session.scalars(
        select(Gameweek).where(Gameweek.season_id == season_id)
    ).all()
    gameweeks_by_number = {
        gameweek.number: gameweek for gameweek in existing_gameweeks
    }

    def player_id(fpl_id: int | None, field: str) -> int | None:
        if fpl_id is None:
            return None
        player = players_by_fpl_id.get(fpl_id)
        if player is None:
            raise ValueError(
                f"Player {fpl_id} referenced by gameweek field {field} "
                "has not been ingested"
            )
        return player.id

    ingested_gameweeks: list[Gameweek] = []

    for gameweek_data in gameweeks_data:
        number = gameweek_data["id"]
        gameweek = gameweeks_by_number.get(number)
        if gameweek is None:
            gameweek = Gameweek(
                fpl_id=gameweek_data["id"],
                season_id=season_id,
                number=number,
            )
            session.add(gameweek)
            gameweeks_by_number[number] = gameweek

        gameweek.fpl_id = gameweek_data["id"]
        gameweek.name = gameweek_data["name"]
        gameweek.deadline_time = _parse_datetime(gameweek_data["deadline_time"])
        gameweek.release_time = _parse_datetime(gameweek_data["release_time"])
        gameweek.finished = gameweek_data["finished"]
        gameweek.data_checked = gameweek_data["data_checked"]
        gameweek.released = gameweek_data["released"]
        gameweek.average_score = gameweek_data["average_entry_score"]
        gameweek.highest_score = gameweek_data["highest_score"]
        gameweek.ranked_count = gameweek_data["ranked_count"]
        gameweek.transfers_made = gameweek_data["transfers_made"]
        gameweek.highest_scoring_entry = gameweek_data["highest_scoring_entry"]
        gameweek.most_selected_player_id = player_id(
            gameweek_data["most_selected"], "most_selected"
        )
        gameweek.most_transferred_in_player_id = player_id(
            gameweek_data["most_transferred_in"], "most_transferred_in"
        )
        gameweek.most_captained_player_id = player_id(
            gameweek_data["most_captained"], "most_captained"
        )
        gameweek.most_vice_captained_player_id = player_id(
            gameweek_data["most_vice_captained"], "most_vice_captained"
        )
        gameweek.top_player_id = player_id(
            gameweek_data["top_element"], "top_element"
        )
        ingested_gameweeks.append(gameweek)

    session.flush()
    return ingested_gameweeks


def ingest_chips(
    session: Session,
    season_id: int,
    chips_data: list[dict[str, Any]],
) -> list[Chip]:
    """Create or update chips for a season from FPL bootstrap data.

    The FPL API identifies a chip's start and end using gameweek numbers.
    The database stores foreign keys to the corresponding Gameweek rows, so
    gameweeks for the season must be ingested before this function is called.

    Commit and rollback are left to the caller.
    """
    gameweeks = session.scalars(
        select(Gameweek).where(Gameweek.season_id == season_id)
    ).all()
    gameweeks_by_number = {gameweek.number: gameweek for gameweek in gameweeks}

    existing_chips = session.scalars(
        select(Chip).where(Chip.season_id == season_id)
    ).all()
    chips_by_fpl_id = {chip.fpl_id: chip for chip in existing_chips}

    ingested_chips: list[Chip] = []

    for chip_data in chips_data:
        start_event = chip_data["start_event"]
        stop_event = chip_data["stop_event"]

        try:
            start_gameweek = gameweeks_by_number[start_event]
            end_gameweek = gameweeks_by_number[stop_event]
        except KeyError as error:
            missing_gameweek = error.args[0]
            raise ValueError(
                f"Gameweek {missing_gameweek} has not been ingested "
                f"for season {season_id}"
            ) from error

        chip = chips_by_fpl_id.get(chip_data["id"])
        if chip is None:
            chip = Chip(fpl_id=chip_data["id"], season_id=season_id)
            session.add(chip)
            chips_by_fpl_id[chip.fpl_id] = chip

        chip.name = chip_data["name"]
        chip.number = chip_data["number"]
        chip.chip_type = chip_data["chip_type"]
        chip.start_gameweek_id = start_gameweek.id
        chip.end_gameweek_id = end_gameweek.id
        ingested_chips.append(chip)

    session.flush()
    return ingested_chips


def ingest_phases(
    session: Session,
    season_id: int,
    phases_data: list[dict[str, Any]],
) -> list[Phase]:
    """Create or update phases after their gameweeks have been ingested."""
    gameweeks = session.scalars(
        select(Gameweek).where(Gameweek.season_id == season_id)
    ).all()
    gameweeks_by_number = {gameweek.number: gameweek for gameweek in gameweeks}
    existing_phases = session.scalars(
        select(Phase).where(Phase.season_id == season_id)
    ).all()
    phases_by_fpl_id = {phase.fpl_id: phase for phase in existing_phases}

    ingested_phases: list[Phase] = []

    for phase_data in phases_data:
        try:
            start_gameweek = gameweeks_by_number[phase_data["start_event"]]
            end_gameweek = gameweeks_by_number[phase_data["stop_event"]]
        except KeyError as error:
            raise ValueError(
                f"Gameweek {error.args[0]} has not been ingested "
                f"for season {season_id}"
            ) from error

        fpl_id = phase_data["id"]
        phase = phases_by_fpl_id.get(fpl_id)
        if phase is None:
            phase = Phase(fpl_id=fpl_id, season_id=season_id)
            session.add(phase)
            phases_by_fpl_id[fpl_id] = phase

        phase.name = phase_data["name"]
        phase.start_gameweek_id = start_gameweek.id
        phase.end_gameweek_id = end_gameweek.id
        phase.highest_score = phase_data["highest_score"]
        ingested_phases.append(phase)

    session.flush()
    return ingested_phases


def ingest_game_rules(
    session: Session,
    season_id: int,
    settings: dict[str, Any],
) -> GameRule:
    """Create or update the game rules for a season."""
    game_rule = session.scalar(
        select(GameRule).where(GameRule.season_id == season_id)
    )
    if game_rule is None:
        game_rule = GameRule(season_id=season_id)
        session.add(game_rule)

    game_rule.squad_size = settings["squad_squadsize"]
    game_rule.starting_size = settings["squad_squadplay"]
    game_rule.max_players_per_team = settings["squad_team_limit"]
    game_rule.budget = settings["squad_total_spend"]
    game_rule.transfer_cap = settings["transfers_cap"]
    game_rule.max_extra_free_transfers = settings["max_extra_free_transfers"]
    game_rule.transfer_sell_on_fee = settings["transfers_sell_on_fee"]
    game_rule.sell_at_purchase_price = settings[
        "element_sell_at_purchase_price"
    ]
    game_rule.vice_captain_enabled = settings["sys_vice_captain_enabled"]
    game_rule.stats_form_days = settings["stats_form_days"]
    game_rule.currency_multiplier = settings["ui_currency_multiplier"]

    session.flush()
    return game_rule


def ingest_scoring_rules(
    session: Session,
    season_id: int,
    scoring_data: dict[str, int | dict[str, int]],
) -> list[ScoringRule]:
    """Create or update general and position-specific scoring rules."""
    positions = session.scalars(select(Position)).all()
    positions_by_code = {position.code: position for position in positions}
    existing_rules = session.scalars(
        select(ScoringRule).where(ScoringRule.season_id == season_id)
    ).all()
    rules_by_key = {
        (rule.stat, rule.position_id): rule for rule in existing_rules
    }

    ingested_rules: list[ScoringRule] = []

    for stat, points_config in scoring_data.items():
        if isinstance(points_config, dict):
            position_points = points_config.items()
        else:
            position_points = ((None, points_config),)

        for position_code, points in position_points:
            position_id: int | None = None
            if position_code is not None:
                position = positions_by_code.get(position_code)
                if position is None:
                    raise ValueError(
                        f"Position {position_code} referenced by scoring rule "
                        f"{stat} has not been ingested"
                    )
                position_id = position.id

            key = (stat, position_id)
            rule = rules_by_key.get(key)
            if rule is None:
                rule = ScoringRule(
                    season_id=season_id,
                    stat=stat,
                    position_id=position_id,
                )
                session.add(rule)
                rules_by_key[key] = rule

            rule.points = points
            ingested_rules.append(rule)

    session.flush()
    return ingested_rules


def ingest_bootstrap_data(
    session: Session,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Ingest the complete bootstrap payload in dependency order.

    The caller owns the transaction and should commit or roll back.
    """
    if data is None:
        data = load_fpl_bootstrap_data()

    season = ingest_season(session)
    positions = ingest_positions(session, data["player_types"])
    teams = ingest_teams(session, season.id, data["teams"])
    players = ingest_players(session, season.id, data["players"])
    player_stats = ingest_player_season_stats(
        session, season.id, data["players"]
    )
    gameweeks = ingest_gameweeks(session, season.id, data["gameweeks"])
    phases = ingest_phases(session, season.id, data["phases"])
    chips = ingest_chips(session, season.id, data["chips"])
    game_rule = ingest_game_rules(session, season.id, data["game_settings"])
    scoring_rules = ingest_scoring_rules(
        session, season.id, data["scoring"]
    )

    return {
        "season": season,
        "positions": positions,
        "teams": teams,
        "players": players,
        "player_stats": player_stats,
        "gameweeks": gameweeks,
        "phases": phases,
        "chips": chips,
        "game_rule": game_rule,
        "scoring_rules": scoring_rules,
    }
