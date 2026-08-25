from datetime import date, datetime
from typing import Any

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
    User,
)


def create_row(session: Session, model, **overrides):
    values: dict[str, Any] = {}
    for column in model.__table__.columns:
        if column.primary_key and column.autoincrement:
            continue
        if column.name in overrides:
            continue
        if column.default is not None:
            continue
        if column.nullable:
            values[column.name] = None
        elif column.name.endswith("_id"):
            raise AssertionError(f"Provide a value for {model.__name__}.{column.name}")
        elif column.type.python_type is bool:
            values[column.name] = False
        elif column.type.python_type is int:
            values[column.name] = 0
        elif column.type.python_type is float:
            values[column.name] = 0.0
        elif column.type.python_type is str:
            values[column.name] = column.name
        elif column.type.python_type is date:
            values[column.name] = date(2026, 1, 1)
        elif column.type.python_type is datetime:
            values[column.name] = datetime(2026, 1, 1)
        else:
            raise AssertionError(f"No factory value for {column.name}")

    row = model(**values, **overrides)
    session.add(row)
    session.flush()
    return row


def make_season(session: Session, **overrides) -> Season:
    defaults = {
        "name": "2026/27",
        "start_date": date(2026, 8, 21),
        "end_date": date(2027, 5, 30),
        "is_current": True,
    }
    return create_row(session, Season, **(defaults | overrides))


def make_user(session: Session, **overrides) -> User:
    defaults = {
        "username": "alex",
        "username_normalized": "alex",
        "email": "alex@example.com",
        "email_normalized": "alex@example.com",
        "password_hash": "$argon2id$placeholder",
        "is_active": True,
        "email_verified_at": None,
    }
    return create_row(session, User, **(defaults | overrides))


def make_position(session: Session, **overrides) -> Position:
    defaults = {
        "fpl_id": 1,
        "code": "GKP",
        "name": "Goalkeeper",
        "squad_select": 2,
        "min_play": 1,
        "max_play": 1,
    }
    return create_row(session, Position, **(defaults | overrides))


def make_team(session: Session, season: Season, **overrides) -> Team:
    defaults = {
        "season_id": season.id,
        "fpl_id": 1,
        "code": 3,
        "name": "Arsenal",
        "short_name": "ARS",
        "played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "points": 0,
        "position": 1,
        "strength": 5,
        "strength_overall_home": 5,
        "strength_overall_away": 5,
        "strength_attack_home": 5,
        "strength_attack_away": 5,
        "strength_defence_home": 5,
        "strength_defence_away": 5,
        "unavailable": False,
    }
    return create_row(session, Team, **(defaults | overrides))


def make_player(
    session: Session,
    team: Team,
    position: Position,
    **overrides,
) -> Player:
    defaults = {
        "fpl_id": 1,
        "code": 1001,
        "opta_code": "p1001",
        "first_name": "David",
        "last_name": "Raya",
        "known_name": None,
        "web_name": "Raya",
        "birth_date": date(1995, 9, 15),
        "region": 200,
        "photo": "1001.jpg",
        "team_id": team.id,
        "position_id": position.id,
        "squad_number": None,
        "team_join_date": date(2024, 7, 4),
        "status": "a",
        "can_select": True,
        "can_transact": True,
        "removed": False,
    }
    return create_row(session, Player, **(defaults | overrides))


def make_stats(
    session: Session,
    player: Player,
    season: Season,
    **overrides,
) -> PlayerSeasonStats:
    defaults = {
        "player_id": player.id,
        "season_id": season.id,
        "total_points": 100,
        "points_per_game": 5.0,
        "ep_next": None,
        "ep_this": None,
        "chance_of_playing_next_round": None,
        "chance_of_playing_this_round": None,
    }
    return create_row(session, PlayerSeasonStats, **(defaults | overrides))


def make_gameweek(session: Session, season: Season, **overrides) -> Gameweek:
    defaults = {
        "fpl_id": 1,
        "season_id": season.id,
        "number": 1,
        "name": "Gameweek 1",
        "deadline_time": datetime(2026, 8, 21, 17, 30),
        "release_time": None,
        "finished": False,
        "data_checked": False,
        "released": True,
        "average_score": 0,
        "highest_score": None,
        "ranked_count": 0,
        "transfers_made": 0,
        "highest_scoring_entry": None,
        "most_selected_player_id": None,
        "most_transferred_in_player_id": None,
        "most_captained_player_id": None,
        "most_vice_captained_player_id": None,
        "top_player_id": None,
    }
    return create_row(session, Gameweek, **(defaults | overrides))


def make_phase(
    session: Session,
    season: Season,
    gameweek: Gameweek,
    **overrides,
) -> Phase:
    defaults = {
        "fpl_id": 1,
        "season_id": season.id,
        "name": "Overall",
        "start_gameweek_id": gameweek.id,
        "end_gameweek_id": gameweek.id,
        "highest_score": None,
    }
    return create_row(session, Phase, **(defaults | overrides))


def make_chip(
    session: Session,
    season: Season,
    gameweek: Gameweek,
    **overrides,
) -> Chip:
    defaults = {
        "fpl_id": 1,
        "season_id": season.id,
        "name": "wildcard",
        "number": 1,
        "chip_type": "transfer",
        "start_gameweek_id": gameweek.id,
        "end_gameweek_id": gameweek.id,
    }
    return create_row(session, Chip, **(defaults | overrides))


def make_game_rule(session: Session, season: Season, **overrides) -> GameRule:
    defaults = {
        "season_id": season.id,
        "squad_size": 15,
        "starting_size": 11,
        "max_players_per_team": 3,
        "budget": 1000,
        "transfer_cap": 20,
        "max_extra_free_transfers": 4,
        "transfer_sell_on_fee": 0.5,
        "sell_at_purchase_price": False,
        "vice_captain_enabled": True,
        "stats_form_days": 30,
        "currency_multiplier": 10,
    }
    return create_row(session, GameRule, **(defaults | overrides))


def make_scoring_rule(
    session: Session,
    season: Season,
    **overrides,
) -> ScoringRule:
    defaults = {
        "season_id": season.id,
        "stat": "assists",
        "position_id": None,
        "points": 3,
    }
    return create_row(session, ScoringRule, **(defaults | overrides))
