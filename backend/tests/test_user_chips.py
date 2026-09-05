from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.db.schema import Gameweek, UserChip
from tests.factories import make_chip, make_gameweek, make_season


def seed_chips(session: Session) -> tuple[int, list[int]]:
    season = make_season(session)
    gameweek = make_gameweek(
        session,
        season,
        deadline_time=datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(days=1),
    )
    chips = [
        make_chip(
            session,
            season,
            gameweek,
            fpl_id=index,
            name=name,
            chip_type="team" if name in {"bboost", "3xc"} else "transfer",
        )
        for index, name in enumerate(
            ("bboost", "3xc", "wildcard", "freehit"), start=1
        )
    ]
    return season.id, [chip.id for chip in chips]


def test_user_can_activate_and_cancel_a_chip(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory.begin() as session:
        season_id, chip_ids = seed_chips(session)

    registered = client.post(
        "/auth/v1/register",
        json={
            "username": "chip-manager",
            "email": "chips@example.com",
            "password": "matchday1",
        },
    )
    assert registered.status_code == 201

    initial = client.get(f"/api/v1/users/me/chips?season_id={season_id}")
    assert initial.status_code == 200
    assert [chip["status"] for chip in initial.json()] == ["available"] * 4

    activated = client.put(
        "/api/v1/users/me/chips/active",
        json={"season_id": season_id, "chip_id": chip_ids[2]},
    )
    assert activated.status_code == 200
    assert [chip["status"] for chip in activated.json()] == [
        "unavailable",
        "unavailable",
        "active",
        "unavailable",
    ]
    assert client.get(
        f"/api/v1/users/me/chips?season_id={season_id}"
    ).json() == activated.json()

    cancelled = client.put(
        "/api/v1/users/me/chips/active",
        json={"season_id": season_id, "chip_id": None},
    )
    assert [chip["status"] for chip in cancelled.json()] == ["available"] * 4

    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(UserChip)) == 4


def test_user_chip_routes_require_auth_and_reject_an_unavailable_chip(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory.begin() as session:
        season_id, _ = seed_chips(session)

    assert client.get(
        f"/api/v1/users/me/chips?season_id={season_id}"
    ).status_code == 401
    client.post(
        "/auth/v1/register",
        json={
            "username": "chip-manager",
            "email": "chips@example.com",
            "password": "matchday1",
        },
    )
    invalid = client.put(
        "/api/v1/users/me/chips/active",
        json={"season_id": season_id, "chip_id": 99_999},
    )
    assert invalid.status_code == 422
    assert "unavailable" in invalid.json()["detail"]


def test_user_cannot_change_a_chip_after_its_deadline(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory.begin() as session:
        season_id, chip_ids = seed_chips(session)

    client.post(
        "/auth/v1/register",
        json={
            "username": "late-chip-manager",
            "email": "late-chips@example.com",
            "password": "matchday1",
        },
    )
    with session_factory.begin() as session:
        gameweek = session.scalar(select(Gameweek))
        assert gameweek is not None
        gameweek.deadline_time = (
            datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1)
        )

    response = client.put(
        "/api/v1/users/me/chips/active",
        json={
            "season_id": season_id,
            "chip_id": chip_ids[0],
            "gameweek_number": 1,
        },
    )
    assert response.status_code == 422
    assert "deadline has passed" in response.json()["detail"]

    states = client.get(f"/api/v1/users/me/chips?season_id={season_id}")
    assert states.status_code == 200
    assert [chip["status"] for chip in states.json()] == ["available"] * 4
