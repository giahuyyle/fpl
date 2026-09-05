from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session, sessionmaker

from app.db.schema import GameRule, Player, PlayerSeasonStats, Position, Season, Team
from app.models.player_search import (
    PlayerSearchRequest,
    PlayerStatFilter,
)
from app.models.squad import SquadPickInput, SquadProfileUpdate, SquadUpsert
from app.services.player_search_service import (
    InvalidSearchFieldError,
    PlayerSearchService,
)
from app.services.squad_service import SquadService, SquadValidationError
from tests.factories import (
    make_game_rule,
    make_player,
    make_position,
    make_season,
    make_stats,
    make_team,
    make_user,
)


@dataclass
class Market:
    season_id: int
    team_ids: list[int]
    position_ids: dict[str, int]
    players_by_position: dict[str, list[int]]
    all_player_ids: list[int]


def seed_market(session: Session, *, budget: int = 1000) -> Market:
    season = make_season(session)
    make_game_rule(session, season, budget=budget)
    positions = [
        make_position(session),
        make_position(
            session,
            fpl_id=2,
            code="DEF",
            name="Defender",
            squad_select=5,
            min_play=3,
            max_play=5,
        ),
        make_position(
            session,
            fpl_id=3,
            code="MID",
            name="Midfielder",
            squad_select=5,
            min_play=2,
            max_play=5,
        ),
        make_position(
            session,
            fpl_id=4,
            code="FWD",
            name="Forward",
            squad_select=3,
            min_play=1,
            max_play=3,
        ),
    ]
    teams = [
        make_team(
            session,
            season,
            fpl_id=index,
            code=index * 10,
            name=f"Club {index}",
            short_name=f"C{index}",
            position=index,
        )
        for index in range(1, 6)
    ]

    counts = {"GKP": 2, "DEF": 5, "MID": 5, "FWD": 3}
    players_by_position: dict[str, list[int]] = {code: [] for code in counts}
    all_player_ids: list[int] = []
    number = 1
    for position in positions:
        for position_index in range(counts[position.code]):
            team = teams[(number - 1) % len(teams)]
            player = make_player(
                session,
                team,
                position,
                fpl_id=number,
                code=10_000 + number,
                first_name=f"Player{number}",
                last_name=f"Surname{number}",
                known_name=f"Known{number}" if number == 3 else None,
                web_name=f"Player {number:02d}",
                photo=f"{number}.jpg",
            )
            make_stats(
                session,
                player,
                season,
                now_cost=40 + number,
                form=float(number),
                total_points=number * 10,
                selected_by_percent=float(number) / 2,
            )
            players_by_position[position.code].append(player.id)
            all_player_ids.append(player.id)
            number += 1

    return Market(
        season_id=season.id,
        team_ids=[team.id for team in teams],
        position_ids={position.code: position.id for position in positions},
        players_by_position=players_by_position,
        all_player_ids=all_player_ids,
    )


def complete_picks(market: Market) -> list[SquadPickInput]:
    picks: list[SquadPickInput] = []
    slot = 1
    for code in ("GKP", "DEF", "MID", "FWD"):
        for player_id in market.players_by_position[code]:
            picks.append(SquadPickInput(slot=slot, player_id=player_id))
            slot += 1
    return picks


def lineup_picks(
    market: Market,
    order: list[int],
    *,
    captain_slot: int | None = None,
    vice_captain_slot: int | None = None,
) -> list[SquadPickInput]:
    positions = {slot: index for index, slot in enumerate(order, start=1)}
    return [
        SquadPickInput(
            slot=pick.slot,
            player_id=pick.player_id,
            lineup_position=positions[pick.slot],
            is_captain=pick.slot == captain_slot,
            is_vice_captain=pick.slot == vice_captain_slot,
        )
        for pick in complete_picks(market)
    ]


def test_player_search_filters_sorts_and_returns_joined_data(session: Session) -> None:
    market = seed_market(session)
    service = PlayerSearchService(session)

    request = PlayerSearchRequest(season_id=market.season_id, limit=5)
    assert request.sort_by == "now_cost"
    assert request.sort_direction == "desc"
    result = service.search(request)
    assert result.total == 15
    assert [item.web_name for item in result.items] == [
        "Player 15",
        "Player 14",
        "Player 13",
        "Player 12",
        "Player 11",
    ]
    assert result.items[0].team.short_name == "C5"
    assert result.items[0].position.code == "FWD"
    assert result.items[0].stats.now_cost == 55

    filtered = service.search(
        PlayerSearchRequest(
            season_id=market.season_id,
            query="known3",
            team_ids=[market.team_ids[2]],
            position_ids=[market.position_ids["DEF"]],
            filters=[
                PlayerStatFilter(field="form", minimum=3, maximum=4),
                PlayerStatFilter(field="now_cost", maximum=50),
            ],
            sort_by="web_name",
            sort_direction="asc",
        )
    )
    assert filtered.total == 1
    assert filtered.items[0].web_name == "Player 03"

    points_ascending = service.search(
        PlayerSearchRequest(
            season_id=market.season_id,
            sort_by="total_points",
            sort_direction="asc",
            offset=1,
            limit=1,
        )
    )
    assert points_ascending.items[0].web_name == "Player 02"
    assert service.get_items(market.season_id, []) == {}
    assert set(service.get_items(market.season_id, market.all_player_ids[:2])) == set(
        market.all_player_ids[:2]
    )


def test_player_search_rejects_unsupported_and_invalid_filters(session: Session) -> None:
    market = seed_market(session)
    service = PlayerSearchService(session)

    with pytest.raises(InvalidSearchFieldError, match="Unsupported player statistic"):
        service.search(
            PlayerSearchRequest(
                season_id=market.season_id,
                filters=[PlayerStatFilter(field="password_hash", minimum=1)],
            )
        )
    with pytest.raises(InvalidSearchFieldError, match="Unsupported player sort"):
        service.search(
            PlayerSearchRequest(season_id=market.season_id, sort_by="unknown")
        )
    with pytest.raises(ValidationError, match="minimum or maximum"):
        PlayerStatFilter(field="form")
    with pytest.raises(ValidationError, match="minimum cannot exceed maximum"):
        PlayerStatFilter(field="form", minimum=2, maximum=1)


def test_squad_service_saves_draft_and_complete_squad(session: Session) -> None:
    market = seed_market(session)
    user = make_user(session)
    service = SquadService(session)

    assert service.get_squad(user.id, market.season_id) is None
    draft = service.upsert_squad(
        user.id,
        SquadUpsert(
            season_id=market.season_id,
            picks=[SquadPickInput(slot=1, player_id=market.all_player_ids[0])],
        ),
    )
    assert draft.is_complete is False
    assert draft.spent == 41
    assert draft.remaining_budget == 959
    assert draft.picks[0].lineup_position is None
    assert service.get_squad(user.id, market.season_id).id == draft.id

    complete = service.upsert_squad(
        user.id,
        SquadUpsert(season_id=market.season_id, picks=complete_picks(market)),
    )
    assert complete.id == draft.id
    assert complete.is_complete is True
    assert len(complete.picks) == 15
    assert {pick.lineup_position for pick in complete.picks} == set(range(1, 16))
    starters = [pick for pick in complete.picks if (pick.lineup_position or 99) <= 11]
    assert len(starters) == 11
    assert complete.spent == sum(range(41, 56))

    with pytest.raises(SquadValidationError, match="complete squad"):
        service.upsert_squad(
            user.id, SquadUpsert(season_id=market.season_id, picks=[])
        )


def test_squad_service_uses_fpl_selling_prices_for_transfers(
    session: Session,
) -> None:
    market = seed_market(session, budget=sum(range(41, 56)))
    user = make_user(session)
    service = SquadService(session)
    original = service.upsert_squad(
        user.id,
        SquadUpsert(season_id=market.season_id, picks=complete_picks(market)),
    )
    assert original.remaining_budget == 0

    outgoing_id = market.players_by_position["GKP"][0]
    session.query(PlayerSeasonStats).filter_by(
        player_id=outgoing_id,
        season_id=market.season_id,
    ).update({"now_cost": 45})
    refreshed = service.get_squad(user.id, market.season_id)
    assert refreshed is not None
    assert refreshed.picks[0].purchase_price == 41
    assert refreshed.picks[0].selling_price == 43
    assert SquadService._selling_price(50, 47, 0.5, False) == 47
    assert SquadService._selling_price(50, 53, 0.5, False) == 51
    assert SquadService._selling_price(50, 53, 0.5, True) == 50

    season = session.get(Season, market.season_id)
    team = session.get(Team, market.team_ids[0])
    position = session.get(Position, market.position_ids["GKP"])
    assert season is not None and team is not None and position is not None
    replacement = make_player(
        session,
        team,
        position,
        fpl_id=99,
        code=10_099,
        web_name="Replacement",
    )
    make_stats(session, replacement, season, now_cost=43)
    transfer_picks = complete_picks(market)
    transfer_picks[0] = SquadPickInput(slot=1, player_id=replacement.id)

    transferred = service.upsert_squad(
        user.id,
        SquadUpsert(season_id=market.season_id, picks=transfer_picks),
    )
    assert transferred.remaining_budget == 0
    assert transferred.picks[0].purchase_price == 43

    unaffordable = make_player(
        session,
        team,
        position,
        fpl_id=100,
        code=10_100,
        web_name="Unaffordable",
    )
    make_stats(session, unaffordable, season, now_cost=44)
    transfer_picks[0] = SquadPickInput(slot=1, player_id=unaffordable.id)
    with pytest.raises(SquadValidationError, match="budget"):
        service.upsert_squad(
            user.id,
            SquadUpsert(season_id=market.season_id, picks=transfer_picks),
        )


def test_squad_service_persists_custom_lineup_and_captains(session: Session) -> None:
    market = seed_market(session)
    user = make_user(session)
    # Swap a fifth midfielder into the XI for a fourth defender (3-5-2).
    order = [1, 3, 4, 5, 12, 8, 9, 10, 11, 13, 14, 2, 7, 6, 15]

    saved = SquadService(session).upsert_squad(
        user.id,
        SquadUpsert(
            season_id=market.season_id,
            picks=lineup_picks(
                market,
                order,
                captain_slot=13,
                vice_captain_slot=1,
            ),
        ),
    )

    by_slot = {pick.slot: pick for pick in saved.picks}
    assert [
        slot for slot, pick in sorted(
            by_slot.items(), key=lambda item: item[1].lineup_position or 99
        )
    ] == order
    assert by_slot[13].is_captain is True
    assert by_slot[1].is_vice_captain is True


@pytest.mark.parametrize(
    ("picks_factory", "message"),
    [
        (
            lambda market: [
                pick.model_copy(update={"lineup_position": 1})
                for pick in complete_picks(market)
            ],
            "every number",
        ),
        (
            lambda market: lineup_picks(
                market,
                [1, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 2, 5, 6, 7],
            ),
            "Starting XI",
        ),
        (
            lambda market: lineup_picks(
                market,
                [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 2, 7, 12, 15],
                captain_slot=2,
            ),
            "starting XI",
        ),
        (
            lambda market: [
                complete_picks(market)[0].model_copy(
                    update={"is_captain": True}
                )
            ],
            "complete squad",
        ),
    ],
)
def test_squad_service_rejects_invalid_lineup_metadata(
    session: Session, picks_factory, message: str
) -> None:
    market = seed_market(session)
    user = make_user(session)
    with pytest.raises(SquadValidationError, match=message):
        SquadService(session).upsert_squad(
            user.id,
            SquadUpsert(
                season_id=market.season_id,
                picks=picks_factory(market),
            ),
        )


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda picks, market: [picks[0], SquadPickInput(slot=1, player_id=picks[1].player_id)], "slots must be unique"),
        (lambda picks, market: [picks[0], SquadPickInput(slot=2, player_id=picks[0].player_id)], "selected once"),
        (lambda picks, market: [SquadPickInput(slot=3, player_id=market.players_by_position["GKP"][0])], "requires a DEF"),
    ],
)
def test_squad_service_rejects_invalid_slots_and_duplicates(
    session: Session, mutation, message: str
) -> None:
    market = seed_market(session)
    user = make_user(session)
    picks = complete_picks(market)
    with pytest.raises(SquadValidationError, match=message):
        SquadService(session).upsert_squad(
            user.id,
            SquadUpsert(season_id=market.season_id, picks=mutation(picks, market)),
        )


def test_squad_service_rejects_club_budget_availability_and_season(
    session: Session,
) -> None:
    market = seed_market(session, budget=100)
    user = make_user(session)
    service = SquadService(session)

    with pytest.raises(SquadValidationError, match="budget"):
        service.upsert_squad(
            user.id,
            SquadUpsert(season_id=market.season_id, picks=complete_picks(market)),
        )

    # Four eligible players from one club violates the ingested club limit.
    session.query(Player).filter(
        Player.id.in_(market.all_player_ids[:4])
    ).update({"team_id": market.team_ids[0]}, synchronize_session=False)
    session.query(GameRule).filter_by(
        season_id=market.season_id
    ).update({"budget": 1000})
    with pytest.raises(SquadValidationError, match="one club"):
        service.upsert_squad(
            user.id,
            SquadUpsert(season_id=market.season_id, picks=complete_picks(market)),
        )

    session.query(Player).filter_by(id=market.all_player_ids[0]).update(
        {"can_select": False}
    )
    with pytest.raises(SquadValidationError, match="not available"):
        service.upsert_squad(
            user.id,
            SquadUpsert(
                season_id=market.season_id,
                picks=[SquadPickInput(slot=1, player_id=market.all_player_ids[0])],
            ),
        )

    with pytest.raises(SquadValidationError, match="belong to this season"):
        service.upsert_squad(
            user.id,
            SquadUpsert(
                season_id=market.season_id,
                picks=[SquadPickInput(slot=1, player_id=99_999)],
            ),
        )
    with pytest.raises(SquadValidationError, match="Game rules"):
        service.upsert_squad(
            user.id, SquadUpsert(season_id=99_999, picks=[])
        )


def test_search_and_squad_api_routes(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    with session_factory.begin() as session:
        market = seed_market(session)

    search = client.post(
        "/api/v1/players/search",
        json={
            "season_id": market.season_id,
            "filters": [{"field": "form", "minimum": 10}],
            "sort_by": "form",
            "limit": 3,
        },
    )
    assert search.status_code == 200
    assert search.json()["total"] == 6
    assert len(search.json()["items"]) == 3
    assert client.post(
        "/api/v1/players/search",
        json={"season_id": market.season_id, "sort_by": "not-a-stat"},
    ).status_code == 422

    assert client.get(
        f"/api/v1/squads/me?season_id={market.season_id}"
    ).status_code == 401
    registered = client.post(
        "/auth/v1/register",
        json={
            "username": "manager",
            "email": "manager@example.com",
            "password": "matchday1",
        },
    )
    assert registered.status_code == 201
    assert client.get(
        f"/api/v1/squads/me?season_id={market.season_id}"
    ).json() is None

    profile = client.patch(
        "/api/v1/squads/me/profile",
        json={
            "season_id": market.season_id,
            "name": "  Matchday Makers  ",
            "badge_style": "cyan-purple",
            "favorite_team_ids": market.team_ids[:2],
        },
    )
    assert profile.status_code == 200
    assert profile.json()["name"] == "Matchday Makers"
    assert profile.json()["badge_style"] == "cyan-purple"
    assert [team["id"] for team in profile.json()["favorite_teams"]] == sorted(
        market.team_ids[:2]
    )
    assert profile.json()["remaining_budget"] == 1000

    invalid_profile = client.patch(
        "/api/v1/squads/me/profile",
        json={
            "season_id": market.season_id,
            "name": "Matchday Makers",
            "badge_style": "cyan-purple",
            "favorite_team_ids": [99_999],
        },
    )
    assert invalid_profile.status_code == 422
    assert "belong to this season" in invalid_profile.json()["detail"]

    saved = client.put(
        "/api/v1/squads/me",
        json={
            "season_id": market.season_id,
            "picks": [
                {"slot": pick.slot, "player_id": pick.player_id}
                for pick in complete_picks(market)
            ],
        },
    )
    assert saved.status_code == 200
    assert saved.json()["name"] == "Matchday Makers"
    assert len(saved.json()["favorite_teams"]) == 2
    assert saved.json()["is_complete"] is True
    assert len(saved.json()["picks"]) == 15
    assert client.put(
        "/api/v1/squads/me",
        json={
            "season_id": market.season_id,
            "picks": [{"slot": 3, "player_id": market.all_player_ids[0]}],
        },
    ).status_code == 422
    assert client.put(
        "/api/v1/squads/me",
        headers={"Origin": "https://evil.example"},
        json={"season_id": market.season_id, "picks": []},
    ).status_code == 403


def test_squad_profile_rejects_duplicate_favorite_clubs(session: Session) -> None:
    market = seed_market(session)
    user = make_user(session)

    with pytest.raises(SquadValidationError, match="must be unique"):
        SquadService(session).update_profile(
            user.id,
            SquadProfileUpdate(
                season_id=market.season_id,
                name="Alex XI",
                badge_style="classic-purple",
                favorite_team_ids=[market.team_ids[0], market.team_ids[0]],
            ),
        )
