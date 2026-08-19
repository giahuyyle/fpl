from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

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


@pytest.fixture
def seeded_data(session_factory: sessionmaker[Session]) -> dict[str, int]:
    with session_factory.begin() as session:
        season = make_season(session)
        position = make_position(session)
        team = make_team(session, season)
        player = make_player(session, team, position)
        stats = make_stats(session, player, season)
        gameweek = make_gameweek(session, season)
        phase = make_phase(session, season, gameweek)
        chip = make_chip(session, season, gameweek)
        game_rule = make_game_rule(session, season)
        scoring_rule = make_scoring_rule(session, season)

        return {
            "season": season.id,
            "position": position.id,
            "team": team.id,
            "player": player.id,
            "stats": stats.id,
            "gameweek": gameweek.id,
            "phase": phase.id,
            "chip": chip.id,
            "game_rule": game_rule.id,
            "scoring_rule": scoring_rule.id,
        }


def test_health_and_openapi_include_all_routes(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}

    paths = set(client.get("/openapi.json").json()["paths"])
    expected = {
        "/api/v1/seasons",
        "/api/v1/teams",
        "/api/v1/positions",
        "/api/v1/players",
        "/api/v1/player-season-stats",
        "/api/v1/gameweeks",
        "/api/v1/phases",
        "/api/v1/chips",
        "/api/v1/game-rules",
        "/api/v1/scoring-rules",
    }
    assert expected <= paths


def test_read_endpoints_return_seeded_resources(
    client: TestClient, seeded_data: dict[str, int]
) -> None:
    season_id = seeded_data["season"]
    collection_paths = [
        "/api/v1/seasons",
        f"/api/v1/teams?season_id={season_id}",
        "/api/v1/positions",
        f"/api/v1/players?season_id={season_id}",
        f"/api/v1/player-season-stats?season_id={season_id}",
        f"/api/v1/gameweeks?season_id={season_id}",
        f"/api/v1/phases?season_id={season_id}",
        f"/api/v1/chips?season_id={season_id}",
        f"/api/v1/scoring-rules?season_id={season_id}",
    ]
    for path in collection_paths:
        response = client.get(path)
        assert response.status_code == 200, path
        assert len(response.json()) == 1, path

    detail_paths = {
        f"/api/v1/seasons/{season_id}": "2026/27",
        f"/api/v1/teams/{seeded_data['team']}": "Arsenal",
        f"/api/v1/positions/{seeded_data['position']}": "Goalkeeper",
        f"/api/v1/players/{seeded_data['player']}": "Raya",
        (
            f"/api/v1/player-season-stats/by-player/{seeded_data['player']}"
            f"?season_id={season_id}"
        ): 100,
        f"/api/v1/gameweeks/{seeded_data['gameweek']}": "Gameweek 1",
        f"/api/v1/phases/{seeded_data['phase']}": "Overall",
        f"/api/v1/chips/{seeded_data['chip']}": "wildcard",
        f"/api/v1/game-rules/{seeded_data['game_rule']}": 1000,
        f"/api/v1/game-rules/by-season/{season_id}": 1000,
        f"/api/v1/scoring-rules/{seeded_data['scoring_rule']}": 3,
    }
    value_fields = (
        "name",
        "name",
        "name",
        "web_name",
        "total_points",
        "name",
        "name",
        "name",
        "budget",
        "budget",
        "points",
    )
    for (path, expected), field in zip(detail_paths.items(), value_fields, strict=True):
        response = client.get(path)
        assert response.status_code == 200, path
        assert response.json()[field] == expected

    assert client.get("/api/v1/seasons/current").json()["id"] == season_id
    assert client.get(
        f"/api/v1/gameweeks/by-number/1?season_id={season_id}"
    ).json()["id"] == seeded_data["gameweek"]


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/seasons/9999",
        "/api/v1/seasons/current",
        "/api/v1/teams/9999",
        "/api/v1/positions/9999",
        "/api/v1/players/9999",
        "/api/v1/player-season-stats/by-player/9999?season_id=9999",
        "/api/v1/gameweeks/9999",
        "/api/v1/gameweeks/by-number/1?season_id=9999",
        "/api/v1/phases/9999",
        "/api/v1/chips/9999",
        "/api/v1/game-rules/9999",
        "/api/v1/game-rules/by-season/9999",
        "/api/v1/scoring-rules/9999",
    ],
)
def test_missing_detail_resources_return_404(client: TestClient, path: str) -> None:
    response = client.get(path)
    assert response.status_code == 404


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/teams",
        "/api/v1/player-season-stats",
        "/api/v1/gameweeks",
        "/api/v1/phases",
        "/api/v1/chips",
        "/api/v1/scoring-rules",
        "/api/v1/players?offset=-1",
        "/api/v1/players?limit=0",
        "/api/v1/players?limit=501",
        "/api/v1/player-season-stats?season_id=1&offset=-1",
        "/api/v1/player-season-stats?season_id=1&limit=501",
    ],
)
def test_query_validation_returns_422(client: TestClient, path: str) -> None:
    assert client.get(path).status_code == 422


def test_season_create_and_patch_endpoints(client: TestClient) -> None:
    create_response = client.post(
        "/api/v1/seasons",
        json={
            "name": "2027/28",
            "start_date": "2027-08-14",
            "is_current": False,
        },
    )
    assert create_response.status_code == 201
    season_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/v1/seasons/{season_id}",
        json={"name": "2027-28", "end_date": "2028-05-21"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "2027-28"
    assert update_response.json()["end_date"] == "2028-05-21"

    assert client.patch(
        "/api/v1/seasons/9999", json={"name": "missing"}
    ).status_code == 404
    assert client.post(
        "/api/v1/seasons", json={"name": "bad", "unexpected": True}
    ).status_code == 422


def test_game_rule_create_and_patch_endpoints(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory.begin() as session:
        season_id = make_season(session, name="2027/28", is_current=False).id

    payload = {
        "season_id": season_id,
        "transfer_cap": 20,
        "max_extra_free_transfers": 4,
        "transfer_sell_on_fee": 0.5,
        "sell_at_purchase_price": False,
        "vice_captain_enabled": True,
        "stats_form_days": 30,
        "currency_multiplier": 10,
    }
    create_response = client.post("/api/v1/game-rules", json=payload)
    assert create_response.status_code == 201
    rule_id = create_response.json()["id"]
    assert create_response.json()["squad_size"] == 15

    update_response = client.patch(
        f"/api/v1/game-rules/{rule_id}", json={"budget": 1100}
    )
    assert update_response.status_code == 200
    assert update_response.json()["budget"] == 1100

    assert client.patch(
        "/api/v1/game-rules/9999", json={"budget": 900}
    ).status_code == 404
    assert client.patch(
        f"/api/v1/game-rules/{rule_id}", json={"budget": None}
    ).status_code == 422


def test_scoring_rule_create_and_patch_endpoints(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory.begin() as session:
        season_id = make_season(session, name="2027/28", is_current=False).id

    create_response = client.post(
        "/api/v1/scoring-rules",
        json={"season_id": season_id, "stat": "assists", "points": 3},
    )
    assert create_response.status_code == 201
    rule_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/v1/scoring-rules/{rule_id}", json={"points": 4}
    )
    assert update_response.status_code == 200
    assert update_response.json()["points"] == 4

    assert client.patch(
        "/api/v1/scoring-rules/9999", json={"points": 1}
    ).status_code == 404
    assert client.patch(
        f"/api/v1/scoring-rules/{rule_id}", json={"points": None}
    ).status_code == 422


def test_api_serializes_dates_and_datetimes(
    client: TestClient, seeded_data: dict[str, int]
) -> None:
    season = client.get(f"/api/v1/seasons/{seeded_data['season']}").json()
    assert season["start_date"] == date(2026, 8, 21).isoformat()

    gameweek = client.get(
        f"/api/v1/gameweeks/{seeded_data['gameweek']}"
    ).json()
    assert gameweek["deadline_time"] == "2026-08-21T17:30:00"
    assert gameweek["release_time"] is None
