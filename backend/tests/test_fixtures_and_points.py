from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.db.schema import (
    Fixture,
    Gameweek,
    Player,
    PlayerGameweekStats,
    Position,
    Season,
    SquadGameweek,
    SquadGameweekPick,
    Team,
)
from app.models.squad import SquadUpsert
from app.services.fixture_service import FixtureService
from app.services.fpl_live_service import FPLLiveService
from app.services.squad_points_service import SquadPointsService
from app.services.squad_service import SquadService
from tests.factories import make_gameweek, make_user
from tests.test_squad_and_search import lineup_picks, seed_market


def fixture_payload(home: int, away: int, *, fixture_id: int = 101, event: int | None = 1):
    return {
        "id": fixture_id,
        "code": fixture_id * 10,
        "event": event,
        "team_h": home,
        "team_a": away,
        "team_h_score": 2,
        "team_a_score": 1,
        "kickoff_time": "2026-08-22T14:00:00Z",
        "started": True,
        "finished": False,
        "finished_provisional": True,
        "minutes": 90,
        "team_h_difficulty": 2,
        "team_a_difficulty": 4,
        "pulse_id": 7001,
    }


def event_payload(player_ids: list[int], *, absent: set[int] | None = None):
    absent = absent or set()
    return {
        "elements": [
            {
                "id": fpl_id,
                "stats": {
                    "total_points": fpl_id,
                    "minutes": 0 if fpl_id in absent else 90,
                    "played": fpl_id not in absent,
                    "in_dreamteam": fpl_id == 15,
                    "starts": 0 if fpl_id in absent else 1,
                    "goals_scored": 1 if fpl_id == 15 else 0,
                    "assists": 1,
                    "clean_sheets": 1,
                    "goals_conceded": 0,
                    "own_goals": 0,
                    "penalties_saved": 0,
                    "penalties_missed": 0,
                    "yellow_cards": 0,
                    "red_cards": 0,
                    "saves": 2,
                    "bonus": 3,
                    "bps": 30,
                    "defensive_contribution": 5,
                },
            }
            for fpl_id in player_ids
        ]
    }


def test_fixture_sync_updates_and_lists_matches(session: Session) -> None:
    market = seed_market(session)
    season = session.get(Season, market.season_id)
    assert season is not None
    gameweek = make_gameweek(session, season, finished=True)
    teams = list(session.scalars(select(Team).order_by(Team.fpl_id)))
    service = FPLLiveService(session)
    payload = fixture_payload(teams[0].fpl_id, teams[1].fpl_id)

    assert service.sync_fixtures(market.season_id, [payload, fixture_payload(999, 998, fixture_id=102)]) == 1
    row = session.scalar(select(Fixture))
    assert row is not None
    assert row.gameweek_id == gameweek.id
    assert row.kickoff_time.isoformat().startswith("2026-08-22T14:00:00")

    payload.update({"finished": True, "team_h_score": 3, "kickoff_time": None, "event": None})
    assert service.sync_fixtures(market.season_id, [payload]) == 1
    session.refresh(row)
    assert row.finished is True
    assert row.home_score == 3
    assert row.gameweek_id is None
    assert row.kickoff_time is None

    all_fixtures = FixtureService(session).list_fixtures(market.season_id)
    assert all_fixtures[0].home_team.name == "Club 1"
    assert all_fixtures[0].away_team.name == "Club 2"
    assert FixtureService(session).list_fixtures(market.season_id, 99) == []


def test_gw1_and_gw2_are_backfilled_and_scored_from_current_squad(session: Session) -> None:
    market = seed_market(session)
    season = session.get(Season, market.season_id)
    assert season is not None
    gw1 = make_gameweek(
        session,
        season,
        fpl_id=1,
        number=1,
        finished=True,
        data_checked=True,
        average_score=50,
        highest_score=120,
    )
    gw2 = make_gameweek(
        session,
        season,
        fpl_id=2,
        number=2,
        name="Gameweek 2",
        deadline_time=datetime(2026, 8, 29),
        finished=True,
        data_checked=True,
        average_score=60,
        highest_score=130,
    )
    make_gameweek(
        session,
        season,
        fpl_id=3,
        number=3,
        name="Gameweek 3",
        deadline_time=datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(days=1),
    )
    user = make_user(session)
    order = [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 2, 7, 12, 15]
    saved = SquadService(session).upsert_squad(
        user.id,
        SquadUpsert(
            season_id=market.season_id,
            picks=lineup_picks(
                market, order, captain_slot=13, vice_captain_slot=14
            ),
        ),
    )
    fpl_ids = list(range(1, 16))
    live = FPLLiveService(session)
    assert live.sync_player_gameweek(market.season_id, 1, event_payload(fpl_ids)) == 15
    # Captain (13) misses GW2; the vice-captain (14) receives the armband.
    # Starter DEF slot 3 also misses out and bench DEF slot 7 comes in.
    assert live.sync_player_gameweek(
        market.season_id, 2, event_payload(fpl_ids, absent={3, 13})
    ) == 15
    assert live.create_due_snapshots(market.season_id) == 2
    assert live.create_due_snapshots(market.season_id) == 0

    snapshots = list(
        session.scalars(
            select(SquadGameweek)
            .where(SquadGameweek.squad_id == saved.id)
            .order_by(SquadGameweek.gameweek_id)
        )
    )
    assert [item.is_backfilled for item in snapshots] == [True, True]
    assert [item.finalized for item in snapshots] == [True, True]
    assert snapshots[0].points > 0
    assert snapshots[1].total_points == snapshots[0].points + snapshots[1].points

    gw2_picks = list(
        session.scalars(
            select(SquadGameweekPick).where(
                SquadGameweekPick.squad_gameweek_id == snapshots[1].id
            )
        )
    )
    by_slot = {pick.slot: pick for pick in gw2_picks}
    assert by_slot[7].was_auto_subbed is True
    assert by_slot[7].multiplier == 1
    assert by_slot[14].multiplier == 2
    assert by_slot[13].multiplier == 0

    result = SquadPointsService(session).get_points(user.id, market.season_id, 2)
    assert result is not None
    assert result.has_snapshot is True
    assert result.is_backfilled is True
    assert result.average_points == 60
    assert result.highest_points == 130
    assert result.total_points == snapshots[1].total_points
    assert len(result.picks) == 15
    assert next(pick for pick in result.picks if pick.slot == 3).played is False
    played_pick = next(pick for pick in result.picks if pick.slot == 4)
    assert played_pick.played is True
    assert played_pick.points_breakdown[0].statistic == "Minutes played"
    assert played_pick.points_breakdown[0].value == 90
    assert sum(item.points for item in played_pick.points_breakdown) == played_pick.points
    assert next(pick for pick in result.picks if pick.slot == 3).points_breakdown == []
    assert [item.gameweek.number for item in SquadPointsService(session).list_points(user.id, market.season_id)] == [1, 2]

    placeholder = SquadPointsService(session).get_points(9999, market.season_id, 1)
    assert placeholder is not None
    assert placeholder.has_snapshot is False
    assert placeholder.points == 0
    assert SquadPointsService(session).get_points(user.id, 9999, 1) is None


def test_squad_points_exclude_future_gameweeks(session: Session) -> None:
    market = seed_market(session)
    season = session.get(Season, market.season_id)
    assert season is not None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    make_gameweek(
        session,
        season,
        deadline_time=now - timedelta(minutes=1),
    )
    make_gameweek(
        session,
        season,
        fpl_id=2,
        number=2,
        name="Gameweek 2",
        deadline_time=now + timedelta(days=1),
        released=True,
    )
    user = make_user(session)
    service = SquadPointsService(session)

    assert service.get_points(user.id, market.season_id, 2) is None
    current = service.get_points(user.id, market.season_id)
    assert current is not None
    assert current.gameweek.number == 1
    assert [item.gameweek.number for item in service.list_points(
        user.id, market.season_id
    )] == [1]


def test_ongoing_gameweek_recovers_snapshot_and_returns_live_points(
    session: Session,
) -> None:
    market = seed_market(session)
    season = session.get(Season, market.season_id)
    assert season is not None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    current = make_gameweek(
        session,
        season,
        fpl_id=3,
        number=3,
        name="Gameweek 3",
        deadline_time=now + timedelta(minutes=5),
    )
    make_gameweek(
        session,
        season,
        fpl_id=4,
        number=4,
        name="Gameweek 4",
        deadline_time=now + timedelta(days=7),
    )
    user = make_user(session)
    order = [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 2, 7, 12, 15]
    SquadService(session).upsert_squad(
        user.id,
        SquadUpsert(
            season_id=market.season_id,
            gameweek_number=3,
            picks=lineup_picks(
                market, order, captain_slot=13, vice_captain_slot=14
            ),
        ),
    )
    current.deadline_time = now - timedelta(minutes=30)
    live = FPLLiveService(session)
    live.sync_player_gameweek(
        market.season_id, 3, event_payload(list(range(1, 16)))
    )
    assert live.create_due_snapshots(market.season_id) == 1

    result = SquadPointsService(session).get_points(
        user.id, market.season_id, 3
    )

    assert result is not None
    assert result.has_snapshot is True
    assert result.is_backfilled is False
    assert result.provisional is True
    assert result.points > 0
    assert len(result.picks) == 15
    assert FPLLiveService(session).ensure_current_snapshot(
        user.id, market.season_id
    ) == 0


def test_sync_rejects_missing_gameweek_and_updates_existing_stats(session: Session) -> None:
    market = seed_market(session)
    service = FPLLiveService(session)
    with pytest.raises(ValueError, match="not available"):
        service.sync_player_gameweek(market.season_id, 9, {"elements": []})

    season = session.get(Season, market.season_id)
    assert season is not None
    make_gameweek(session, season)
    assert service.sync_player_gameweek(market.season_id, 1, event_payload([1])) == 1
    assert service.sync_player_gameweek(
        market.season_id,
        1,
        {"elements": [{"id": 1, "stats": {"total_points": 9}}, {"id": 999, "stats": {}}]},
    ) == 1
    row = session.scalar(select(PlayerGameweekStats))
    assert row is not None
    assert row.total_points == 9
    assert row.played is False


def test_point_engine_handles_bench_boost_triple_captain_and_rank_ties(session: Session) -> None:
    market = seed_market(session)
    positions = {}
    players = list(session.scalars(select(Player).order_by(Player.fpl_id)))
    position_rows = {
        row.id: row
        for row in session.scalars(select(Position))
    }
    stats = {}
    for player in players:
        position = position_rows[player.position_id]
        positions[player.id] = (position.code, position.min_play, position.max_play)
        stats[player.id] = PlayerGameweekStats(
            player_id=player.id,
            gameweek_id=1,
            total_points=2,
            minutes=90,
            played=True,
        )
    picks = [
        SquadGameweekPick(
            squad_gameweek_id=1,
            player_id=player.id,
            slot=index,
            lineup_position=index,
            purchase_price=50,
            is_captain=index == 1,
            is_vice_captain=index == 2,
        )
        for index, player in enumerate(players, start=1)
    ]
    snapshot = SquadGameweek(squad_id=1, gameweek_id=1)
    FPLLiveService._score_picks(snapshot, picks, stats, positions, "bboost")
    assert snapshot.points == 32
    assert snapshot.points_on_bench == 0

    FPLLiveService._score_picks(snapshot, picks, stats, positions, "3xc")
    assert picks[0].multiplier == 3
    assert snapshot.points == 26

    # During live play, a captain whose fixture has not completed keeps the
    # armband and automatic substitutions wait for final FPL confirmation.
    stats[picks[0].player_id].played = False
    FPLLiveService._score_picks(
        snapshot,
        picks,
        stats,
        positions,
        None,
        finalized=False,
    )
    assert picks[0].multiplier == 2
    assert picks[1].multiplier == 1
    assert all(pick.multiplier == 0 for pick in picks[11:])
    assert not any(pick.was_auto_subbed for pick in picks)

    assert FPLLiveService._valid_formation_after(
        __import__("collections").Counter({"GKP": 1, "DEF": 5, "MID": 2, "FWD": 1}),
        ("DEF", 3, 5),
    ) is False
    assert FPLLiveService._parse_datetime(None) is None


def test_fixture_and_points_routes(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory.begin() as session:
        market = seed_market(session)
        season = session.get(Season, market.season_id)
        assert season is not None
        make_gameweek(session, season)
        teams = list(session.scalars(select(Team).order_by(Team.fpl_id)))
        FPLLiveService(session).sync_fixtures(
            market.season_id,
            [fixture_payload(teams[0].fpl_id, teams[1].fpl_id)],
        )

    fixtures = client.get(f"/api/v1/fixtures?season_id={market.season_id}&gameweek_number=1")
    assert fixtures.status_code == 200
    assert fixtures.json()[0]["home_team"]["name"] == "Club 1"
    assert client.get(f"/api/v1/squads/me/points/history?season_id={market.season_id}").status_code == 401

    assert client.post(
        "/auth/v1/register",
        json={"username": "points", "email": "points@example.com", "password": "matchday1"},
    ).status_code == 201
    history = client.get(f"/api/v1/squads/me/points/history?season_id={market.season_id}")
    assert history.status_code == 200
    assert history.json()[0]["points"] == 0
    current = client.get(f"/api/v1/squads/me/points?season_id={market.season_id}&gameweek_number=1")
    assert current.status_code == 200
    assert current.json()["has_snapshot"] is False
