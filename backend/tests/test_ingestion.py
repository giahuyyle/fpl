import logging
import runpy
import sys
from datetime import date, datetime

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

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
from app.ingest import initial_ingestion
from app.ingest.ingest import (
    _optional_float,
    _parse_date,
    _parse_datetime,
    ingest_bootstrap_data,
    ingest_chips,
    ingest_gameweeks,
    ingest_phases,
    ingest_player_season_stats,
    ingest_players,
    ingest_scoring_rules,
)
from app.ingest.load_fpl_bootstrap_data import load_fpl_bootstrap_data
from tests.factories import make_player, make_position, make_season, make_team


EXPECTED_COUNTS = {
    "season": 1,
    "positions": 4,
    "teams": 20,
    "players": 587,
    "player_stats": 587,
    "gameweeks": 38,
    "phases": 11,
    "chips": 8,
    "game_rule": 1,
    "scoring_rules": 65,
}


def result_counts(result: dict) -> dict[str, int]:
    return {
        name: len(records) if isinstance(records, list) else 1
        for name, records in result.items()
    }


def test_loader_returns_every_ingestion_dataset_from_any_working_directory(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.chdir(tmp_path)

    data = load_fpl_bootstrap_data()

    assert set(data) == {
        "chips",
        "gameweeks",
        "phases",
        "teams",
        "element_stats",
        "player_types",
        "players",
        "game_settings",
        "scoring",
    }
    assert len(data["players"]) == 587
    assert len(data["gameweeks"]) == 38
    assert data["scoring"]["assists"] == 3


def test_ingestion_conversion_helpers() -> None:
    assert _parse_date(None) is None
    assert _parse_date("") is None
    assert _parse_date("2026-08-21") == date(2026, 8, 21)
    assert _parse_datetime(None) is None
    assert _parse_datetime("") is None
    assert _parse_datetime("2026-08-21T17:30:00Z") == datetime(
        2026, 8, 21, 17, 30
    )
    assert _optional_float(None) is None
    assert _optional_float("4.5") == 4.5
    assert _optional_float(2) == 2.0


def test_full_ingestion_maps_all_data_and_is_idempotent(session: Session) -> None:
    old_season = make_season(
        session,
        name="2025/26",
        start_date=date(2025, 8, 15),
        end_date=date(2026, 5, 24),
        is_current=True,
    )

    first = ingest_bootstrap_data(session)
    second = ingest_bootstrap_data(session, load_fpl_bootstrap_data())

    assert result_counts(first) == EXPECTED_COUNTS
    assert result_counts(second) == EXPECTED_COUNTS
    assert old_season.is_current is False

    model_counts = {
        Season: 2,
        Position: 4,
        Team: 20,
        Player: 587,
        PlayerSeasonStats: 587,
        Gameweek: 38,
        Phase: 11,
        Chip: 8,
        GameRule: 1,
        ScoringRule: 65,
    }
    for model, expected in model_counts.items():
        count = session.scalar(select(func.count()).select_from(model))
        assert count == expected, model.__name__

    raya = session.scalar(select(Player).where(Player.fpl_id == 1))
    assert raya is not None
    assert raya.last_name == "Raya Martín"
    assert raya.known_name is None
    assert raya.birth_date == date(1995, 9, 15)

    stats = session.scalar(
        select(PlayerSeasonStats).where(PlayerSeasonStats.player_id == raya.id)
    )
    assert stats is not None
    assert stats.influence == 541.6
    assert stats.ep_this is None

    gameweek = session.scalar(select(Gameweek).where(Gameweek.number == 1))
    assert gameweek is not None
    assert gameweek.deadline_time == datetime(2026, 8, 21, 17, 30)

    goalkeeper_goals = session.scalar(
        select(ScoringRule).where(
            ScoringRule.stat == "goals_scored",
            ScoringRule.position_id == raya.position_id,
        )
    )
    assert goalkeeper_goals is not None
    assert goalkeeper_goals.points == 10

    assists = session.scalar(
        select(ScoringRule).where(
            ScoringRule.stat == "assists",
            ScoringRule.position_id.is_(None),
        )
    )
    assert assists is not None
    assert assists.points == 3


def test_ingest_players_requires_team_and_position(session: Session) -> None:
    season = make_season(session)
    player_data = load_fpl_bootstrap_data()["players"][0]

    with pytest.raises(ValueError, match="Missing team or position"):
        ingest_players(session, season.id, [player_data])

    make_team(session, season, fpl_id=player_data["team"])
    with pytest.raises(ValueError, match="Missing team or position"):
        ingest_players(session, season.id, [player_data])


def test_ingest_player_stats_requires_players(session: Session) -> None:
    season = make_season(session)
    player_data = load_fpl_bootstrap_data()["players"][0]

    with pytest.raises(ValueError, match="Player 1 has not been ingested"):
        ingest_player_season_stats(session, season.id, [player_data])


def test_gameweek_player_references_resolve_to_database_ids(session: Session) -> None:
    season = make_season(session)
    position = make_position(session)
    team = make_team(session, season)
    player = make_player(session, team, position, fpl_id=44)
    gameweek_data = load_fpl_bootstrap_data()["gameweeks"][0].copy()
    for field in (
        "most_selected",
        "most_transferred_in",
        "most_captained",
        "most_vice_captained",
        "top_element",
    ):
        gameweek_data[field] = player.fpl_id

    gameweek = ingest_gameweeks(session, season.id, [gameweek_data])[0]

    assert gameweek.most_selected_player_id == player.id
    assert gameweek.most_transferred_in_player_id == player.id
    assert gameweek.most_captained_player_id == player.id
    assert gameweek.most_vice_captained_player_id == player.id
    assert gameweek.top_player_id == player.id


def test_gameweek_rejects_unknown_player_reference(session: Session) -> None:
    season = make_season(session)
    gameweek_data = load_fpl_bootstrap_data()["gameweeks"][0].copy()
    gameweek_data["most_selected"] = 99999

    with pytest.raises(ValueError, match="most_selected"):
        ingest_gameweeks(session, season.id, [gameweek_data])


@pytest.mark.parametrize(
    ("ingester", "payload_key"),
    [(ingest_chips, "chips"), (ingest_phases, "phases")],
)
def test_gameweek_dependent_ingesters_require_gameweeks(
    session: Session, ingester, payload_key: str
) -> None:
    season = make_season(session)
    payload = load_fpl_bootstrap_data()[payload_key][0]

    with pytest.raises(ValueError, match="Gameweek"):
        ingester(session, season.id, [payload])


def test_scoring_rules_require_known_position_codes(session: Session) -> None:
    season = make_season(session)

    with pytest.raises(ValueError, match="Position GKP"):
        ingest_scoring_rules(
            session,
            season.id,
            {"goals_scored": {"GKP": 10}},
        )


def test_initial_ingestion_runner_commits_and_is_idempotent(
    session_factory: sessionmaker[Session], monkeypatch
) -> None:
    monkeypatch.setattr(initial_ingestion, "SessionLocal", session_factory)

    assert initial_ingestion.run_initial_ingestion() == EXPECTED_COUNTS
    assert initial_ingestion.run_initial_ingestion() == EXPECTED_COUNTS

    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Season)) == 1
        assert session.scalar(select(func.count()).select_from(Player)) == 587


def test_initial_ingestion_runner_rolls_back_on_failure(
    session_factory: sessionmaker[Session], monkeypatch
) -> None:
    monkeypatch.setattr(initial_ingestion, "SessionLocal", session_factory)

    def fail_after_insert(session: Session):
        session.add(Season(name="should roll back", is_current=False))
        session.flush()
        raise RuntimeError("ingestion exploded")

    monkeypatch.setattr(initial_ingestion, "ingest_bootstrap_data", fail_after_insert)

    with pytest.raises(RuntimeError, match="ingestion exploded"):
        initial_ingestion.run_initial_ingestion()

    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Season)) == 0


def test_initial_ingestion_main_logs_success(monkeypatch, caplog) -> None:
    monkeypatch.setattr(
        initial_ingestion,
        "run_initial_ingestion",
        lambda: {"season": 1, "players": 587},
    )
    caplog.set_level(logging.INFO)

    initial_ingestion.main()

    assert "Starting initial FPL data ingestion" in caplog.text
    assert "Initial FPL data ingestion completed" in caplog.text
    assert "Ingested players: 587" in caplog.text


def test_initial_ingestion_main_logs_and_reraises_failure(
    monkeypatch, caplog
) -> None:
    def fail():
        raise RuntimeError("failed")

    monkeypatch.setattr(initial_ingestion, "run_initial_ingestion", fail)
    caplog.set_level(logging.ERROR)

    with pytest.raises(RuntimeError, match="failed"):
        initial_ingestion.main()

    assert "failed and was rolled back" in caplog.text


def test_initial_ingestion_module_entrypoint(
    session_factory: sessionmaker[Session], monkeypatch
) -> None:
    monkeypatch.setattr("app.db.schema.SessionLocal", session_factory)
    monkeypatch.delitem(
        sys.modules, "app.ingest.initial_ingestion", raising=False
    )

    runpy.run_module("app.ingest.initial_ingestion", run_name="__main__")

    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Season)) == 1
