from datetime import date
from unittest.mock import Mock

import pytest
from pydantic import ValidationError

from app.api import dependencies
from app.core.config import Config
from app.core.logging import setup_logging
from app.models import (
    GameRuleCreate,
    GameRuleUpdate,
    ScoringRuleCreate,
    ScoringRuleUpdate,
    SeasonCreate,
    SeasonUpdate,
)


def valid_game_rule_data() -> dict:
    return {
        "season_id": 1,
        "transfer_cap": 20,
        "max_extra_free_transfers": 4,
        "transfer_sell_on_fee": 0.5,
        "sell_at_purchase_price": False,
        "vice_captain_enabled": True,
        "stats_form_days": 30,
        "currency_multiplier": 10,
    }


def test_config_builds_postgresql_url() -> None:
    config = Config(
        db_user="fpl_user",
        db_password="secret",
        db_host="database",
        db_port=5432,
        db_name="fpl_test",
    )

    assert config.postgresql_db_url == (
        "postgresql://fpl_user:secret@database:5432/fpl_test"
    )


def test_setup_logging_uses_expected_configuration(monkeypatch) -> None:
    basic_config = Mock()
    monkeypatch.setattr("app.core.logging.logging.basicConfig", basic_config)

    setup_logging()

    basic_config.assert_called_once_with(
        level=20,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


def test_get_session_commits_and_closes(monkeypatch) -> None:
    session = Mock()
    monkeypatch.setattr(dependencies, "SessionLocal", Mock(return_value=session))

    dependency = dependencies.get_session()
    assert next(dependency) is session

    with pytest.raises(StopIteration):
        next(dependency)

    session.commit.assert_called_once_with()
    session.rollback.assert_not_called()
    session.close.assert_called_once_with()


def test_get_session_rolls_back_and_closes_on_error(monkeypatch) -> None:
    session = Mock()
    monkeypatch.setattr(dependencies, "SessionLocal", Mock(return_value=session))

    dependency = dependencies.get_session()
    next(dependency)

    with pytest.raises(RuntimeError, match="database failure"):
        dependency.throw(RuntimeError("database failure"))

    session.commit.assert_not_called()
    session.rollback.assert_called_once_with()
    session.close.assert_called_once_with()


def test_season_request_models_validate_updates_and_extra_fields() -> None:
    payload = SeasonCreate(name="2026/27")
    assert payload.start_date is None
    assert payload.end_date is None
    assert payload.is_current is False

    update = SeasonUpdate(start_date=None)
    assert update.model_dump(exclude_unset=True) == {"start_date": None}

    for field in ("name", "is_current"):
        with pytest.raises(ValidationError, match=f"{field} cannot be null"):
            SeasonUpdate.model_validate({field: None})

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        SeasonCreate(name="2026/27", unexpected=True)

    assert SeasonUpdate.reject_null_for_required_fields("unchanged") == "unchanged"


def test_game_rule_request_models_apply_defaults_and_reject_null_updates() -> None:
    payload = GameRuleCreate(**valid_game_rule_data())
    assert payload.squad_size == 15
    assert payload.starting_size == 11
    assert payload.max_players_per_team == 3
    assert payload.budget == 1000

    update = GameRuleUpdate(budget=1100)
    assert update.model_dump(exclude_unset=True) == {"budget": 1100}

    with pytest.raises(ValidationError, match="fields cannot be null: budget"):
        GameRuleUpdate(budget=None)

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        GameRuleUpdate(season_id=2)

    assert GameRuleUpdate.reject_explicit_nulls("unchanged") == "unchanged"


def test_scoring_rule_request_models_keep_identity_immutable() -> None:
    create = ScoringRuleCreate(
        season_id=1,
        stat="goals_scored",
        position_id=None,
        points=5,
    )
    assert create.position_id is None

    assert ScoringRuleUpdate().model_dump(exclude_unset=True) == {}
    assert ScoringRuleUpdate(points=4).model_dump(exclude_unset=True) == {
        "points": 4
    }

    with pytest.raises(ValidationError, match="points cannot be null"):
        ScoringRuleUpdate(points=None)

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        ScoringRuleUpdate(stat="assists")


def test_pydantic_parses_iso_dates() -> None:
    payload = SeasonCreate(
        name="2026/27",
        start_date="2026-08-21",
        end_date="2027-05-30",
    )

    assert payload.start_date == date(2026, 8, 21)
    assert payload.end_date == date(2027, 5, 30)
