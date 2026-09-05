import logging
import time
from typing import Any

import requests
from sqlalchemy import func, select

from app.db.schema import Gameweek, PlayerGameweekStats, Season, SessionLocal
from app.ingest.hourly_ingestion import (
    FPL_BOOTSTRAP_API,
    REQUEST_TIMEOUT_SECONDS,
    get_ingestion_data,
)
from app.ingest.ingest import ingest_bootstrap_data
from app.services.fpl_live_service import FPLLiveService


logger = logging.getLogger(__name__)
FPL_FIXTURES_API = "https://fantasy.premierleague.com/api/fixtures/"
FPL_EVENT_LIVE_API = "https://fantasy.premierleague.com/api/event/{event}/live/"


def _get_json(url: str) -> Any:
    response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.json()


def _event_numbers_to_sync(bootstrap: dict[str, Any]) -> list[int]:
    current = {
        event["id"] for event in bootstrap["gameweeks"] if event.get("is_current")
    }
    finished = {
        event["id"] for event in bootstrap["gameweeks"] if event.get("finished")
    }
    with SessionLocal() as session:
        season = session.scalar(select(Season).where(Season.is_current.is_(True)))
        if season is None:
            return sorted(finished | current)
        populated = set(
            session.scalars(
                select(Gameweek.number)
                .join(
                    PlayerGameweekStats,
                    PlayerGameweekStats.gameweek_id == Gameweek.id,
                )
                .where(Gameweek.season_id == season.id)
                .group_by(Gameweek.number)
                .having(func.count(PlayerGameweekStats.id) > 0)
            )
        )
    return sorted((finished - populated) | current)


def sync_once() -> dict[str, int]:
    bootstrap = get_ingestion_data()
    fixtures: list[dict[str, Any]] = _get_json(FPL_FIXTURES_API)
    event_numbers = _event_numbers_to_sync(bootstrap)
    live_payloads = {
        number: _get_json(FPL_EVENT_LIVE_API.format(event=number))
        for number in event_numbers
    }

    with SessionLocal.begin() as session:
        ingest_bootstrap_data(session, data=bootstrap)
        season = session.scalar(select(Season).where(Season.is_current.is_(True)))
        if season is None:
            raise RuntimeError("No current season exists after bootstrap ingestion")
        service = FPLLiveService(session)
        fixture_count = service.sync_fixtures(season.id, fixtures)
        player_rows = sum(
            service.sync_player_gameweek(season.id, number, payload)
            for number, payload in live_payloads.items()
        )
        snapshots = service.create_due_snapshots(season.id)
        # New snapshots need one scoring pass after their picks have been inserted.
        for number in event_numbers:
            gameweek = next(
                item for item in bootstrap["gameweeks"] if item["id"] == number
            )
            if gameweek.get("finished") or gameweek.get("is_current"):
                local = session.scalar(
                    select(Gameweek).where(
                        Gameweek.season_id == season.id,
                        Gameweek.number == number,
                    )
                )
                if local is not None:
                    service.score_gameweek(local)

    return {
        "fixtures": fixture_count,
        "player_gameweek_rows": player_rows,
        "squad_snapshots": snapshots,
        "events": len(live_payloads),
    }


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    logger.info("Starting FPL fixture and points worker using %s", FPL_BOOTSTRAP_API)
    while True:
        delay = 300
        try:
            counts = sync_once()
            logger.info("FPL fixture and points sync completed: %s", counts)
            if counts["events"] == 0:
                delay = 3600
        except Exception:
            logger.exception("FPL fixture and points sync failed")
            delay = 60
        time.sleep(delay)


if __name__ == "__main__":
    main()
