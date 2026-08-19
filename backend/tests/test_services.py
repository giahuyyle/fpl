from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    GameRuleCreate,
    GameRuleUpdate,
    ScoringRuleCreate,
    ScoringRuleUpdate,
    SeasonCreate,
    SeasonUpdate,
)
from app.services import (
    ChipService,
    GameRuleService,
    GameweekService,
    PhaseService,
    PlayerSeasonStatsService,
    PlayerService,
    PositionService,
    ScoringRuleService,
    SeasonService,
    TeamService,
)
from app.services.pagination import validate_pagination
from tests.factories import (
    make_chip,
    make_game_rule,
    make_gameweek,
    make_phase,
    make_player,
    make_position,
    make_scoring_rule,
    make_season,
    make_stats,
    make_team,
)


def game_rule_payload(season_id: int) -> GameRuleCreate:
    return GameRuleCreate(
        season_id=season_id,
        transfer_cap=20,
        max_extra_free_transfers=4,
        transfer_sell_on_fee=0.5,
        sell_at_purchase_price=False,
        vice_captain_enabled=True,
        stats_form_days=30,
        currency_multiplier=10,
    )


@pytest.mark.parametrize(
    ("offset", "limit", "message"),
    [
        (-1, 100, "offset must be non-negative"),
        (0, 0, "limit must be between 1 and 500"),
        (0, 501, "limit must be between 1 and 500"),
    ],
)
def test_validate_pagination_rejects_invalid_bounds(
    offset: int, limit: int, message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        validate_pagination(offset, limit)


@pytest.mark.parametrize(("offset", "limit"), [(0, 1), (10, 500)])
def test_validate_pagination_accepts_valid_bounds(offset: int, limit: int) -> None:
    validate_pagination(offset, limit)


def test_season_service_crud_and_current_selection(session: Session) -> None:
    service = SeasonService(session)
    older = service.create_season(
        SeasonCreate(name="2025/26", is_current=True)
    )
    current = service.create_season(
        SeasonCreate(
            name="2026/27",
            start_date=date(2026, 8, 21),
            is_current=True,
        )
    )

    assert service.get_season(older.id) is older
    assert service.get_season(9999) is None
    assert service.list_seasons() == [older, current]
    assert service.get_current_season() is current

    updated = service.update_season(
        current.id, SeasonUpdate(name="2026-27", end_date=date(2027, 5, 30))
    )
    assert updated is current
    assert current.name == "2026-27"
    assert current.end_date == date(2027, 5, 30)
    assert service.update_season(9999, SeasonUpdate(name="missing")) is None


def test_current_season_returns_none_when_none_is_current(session: Session) -> None:
    make_season(session, is_current=False)
    assert SeasonService(session).get_current_season() is None


def test_rule_services_crud_and_ordering(session: Session) -> None:
    season = make_season(session)
    position = make_position(session)

    game_rules = GameRuleService(session)
    game_rule = game_rules.create_game_rule(game_rule_payload(season.id))
    assert game_rules.get_game_rule(game_rule.id) is game_rule
    assert game_rules.get_game_rule_by_season(season.id) is game_rule
    assert game_rules.get_game_rule(9999) is None
    assert game_rules.get_game_rule_by_season(9999) is None
    assert game_rules.update_game_rule(
        game_rule.id, GameRuleUpdate(budget=1050)
    ) is game_rule
    assert game_rule.budget == 1050
    assert game_rules.update_game_rule(9999, GameRuleUpdate(budget=900)) is None

    scoring_rules = ScoringRuleService(session)
    goals = scoring_rules.create_scoring_rule(
        ScoringRuleCreate(
            season_id=season.id,
            stat="goals_scored",
            position_id=position.id,
            points=6,
        )
    )
    assists = scoring_rules.create_scoring_rule(
        ScoringRuleCreate(season_id=season.id, stat="assists", points=3)
    )
    assert scoring_rules.get_scoring_rule(goals.id) is goals
    assert scoring_rules.get_scoring_rule(9999) is None
    assert scoring_rules.list_scoring_rules(season.id) == [assists, goals]
    assert scoring_rules.update_scoring_rule(
        goals.id, ScoringRuleUpdate(points=7)
    ) is goals
    assert goals.points == 7
    assert scoring_rules.update_scoring_rule(
        9999, ScoringRuleUpdate(points=1)
    ) is None


def test_reference_services_get_list_sort_and_filter(session: Session) -> None:
    season = make_season(session)
    other_season = make_season(
        session,
        name="2025/26",
        start_date=date(2025, 8, 15),
        end_date=date(2026, 5, 24),
        is_current=False,
    )
    goalkeeper = make_position(session)
    midfielder = make_position(
        session,
        fpl_id=3,
        code="MID",
        name="Midfielder",
        squad_select=5,
        min_play=2,
        max_play=5,
    )
    arsenal = make_team(session, season, position=2)
    chelsea = make_team(
        session,
        season,
        fpl_id=2,
        code=8,
        name="Chelsea",
        short_name="CHE",
        position=1,
    )
    old_team = make_team(
        session,
        other_season,
        fpl_id=1,
        name="Old Arsenal",
        short_name="OLD",
    )
    raya = make_player(session, arsenal, goalkeeper)
    palmer = make_player(
        session,
        chelsea,
        midfielder,
        fpl_id=2,
        code=1002,
        first_name="Cole",
        last_name="Palmer",
        known_name="Cold Palmer",
        web_name="Palmer",
        status="d",
    )
    old_player = make_player(
        session,
        old_team,
        midfielder,
        fpl_id=3,
        code=1003,
        first_name="Former",
        last_name="Player",
        web_name="Former",
    )

    teams = TeamService(session)
    assert teams.get_team(arsenal.id) is arsenal
    assert teams.get_team(9999) is None
    assert teams.list_teams(season.id) == [chelsea, arsenal]

    positions = PositionService(session)
    assert positions.get_position(goalkeeper.id) is goalkeeper
    assert positions.get_position(9999) is None
    assert positions.list_positions() == [goalkeeper, midfielder]

    players = PlayerService(session)
    assert players.get_player(raya.id) is raya
    assert players.get_player(9999) is None
    assert players.list_players(season_id=season.id) == [palmer, raya]
    assert players.list_players(team_id=chelsea.id) == [palmer]
    assert players.list_players(position_id=goalkeeper.id) == [raya]
    assert players.list_players(status="d") == [palmer]
    assert players.list_players(search="  cold ") == [palmer]
    assert players.list_players(search="david") == [raya]
    assert players.list_players(search="RAYA") == [raya]
    assert players.list_players(search="   ") == [old_player, palmer, raya]
    assert players.list_players(offset=1, limit=1) == [palmer]

    with pytest.raises(ValueError, match="offset"):
        players.list_players(offset=-1)
    with pytest.raises(ValueError, match="limit"):
        players.list_players(limit=501)


def test_stats_and_gameweek_services(session: Session) -> None:
    season = make_season(session)
    position = make_position(session)
    team = make_team(session, season)
    player_one = make_player(session, team, position)
    player_two = make_player(
        session,
        team,
        position,
        fpl_id=2,
        code=1002,
        web_name="Second",
    )
    high = make_stats(session, player_one, season, total_points=200)
    low = make_stats(session, player_two, season, total_points=100)
    gw_two = make_gameweek(
        session,
        season,
        fpl_id=2,
        number=2,
        name="Gameweek 2",
    )
    gw_one = make_gameweek(session, season)

    stats = PlayerSeasonStatsService(session)
    assert stats.get_player_season_stats(player_one.id, season.id) is high
    assert stats.get_player_season_stats(9999, season.id) is None
    assert stats.list_player_season_stats(season.id) == [high, low]
    assert stats.list_player_season_stats(season.id, offset=1, limit=1) == [low]
    with pytest.raises(ValueError, match="offset"):
        stats.list_player_season_stats(season.id, offset=-1)

    gameweeks = GameweekService(session)
    assert gameweeks.get_gameweek(gw_one.id) is gw_one
    assert gameweeks.get_gameweek(9999) is None
    assert gameweeks.get_gameweek_by_number(season.id, 2) is gw_two
    assert gameweeks.get_gameweek_by_number(season.id, 99) is None
    assert gameweeks.list_gameweeks(season.id) == [gw_one, gw_two]


def test_phase_and_chip_services(session: Session) -> None:
    season = make_season(session)
    gameweek = make_gameweek(session, season)
    later_phase = make_phase(session, season, gameweek, fpl_id=2, name="Second")
    first_phase = make_phase(session, season, gameweek, fpl_id=1)
    later_chip = make_chip(session, season, gameweek, fpl_id=2, name="freehit")
    first_chip = make_chip(session, season, gameweek, fpl_id=1)

    phases = PhaseService(session)
    assert phases.get_phase(first_phase.id) is first_phase
    assert phases.get_phase(9999) is None
    assert phases.list_phases(season.id) == [first_phase, later_phase]

    chips = ChipService(session)
    assert chips.get_chip(first_chip.id) is first_chip
    assert chips.get_chip(9999) is None
    assert chips.list_chips(season.id) == [first_chip, later_chip]


def test_database_unique_constraints_are_enforced(session: Session) -> None:
    season = make_season(session)
    make_team(session, season)

    with pytest.raises(IntegrityError):
        make_team(session, season)


def test_single_game_rule_per_season_is_enforced(session: Session) -> None:
    season = make_season(session)
    make_game_rule(session, season)

    with pytest.raises(IntegrityError):
        make_game_rule(session, season)


def test_scoring_rule_factory_supports_nullable_position(session: Session) -> None:
    season = make_season(session)
    rule = make_scoring_rule(session, season)
    assert rule.position_id is None
    assert rule.points == 3
