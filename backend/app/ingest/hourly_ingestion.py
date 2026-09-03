import logging
from typing import Any

import requests

from app.db.schema import SessionLocal
from app.ingest.ingest import ingest_bootstrap_data


logger = logging.getLogger(__name__)

FPL_BOOTSTRAP_API = "https://fantasy.premierleague.com/api/bootstrap-static/"
REQUEST_TIMEOUT_SECONDS = 30


def get_ingestion_data() -> dict[str, Any]:
    """Fetch and normalize the latest FPL bootstrap payload."""
    response = requests.get(
        FPL_BOOTSTRAP_API,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    raw_data = response.json()

    return {
        "chips": raw_data["chips"],
        "gameweeks": raw_data["events"],
        "phases": raw_data["phases"],
        "teams": raw_data["teams"],
        "element_stats": raw_data["element_stats"],
        "player_types": raw_data["element_types"],
        "players": raw_data["elements"],
        "game_settings": raw_data["game_settings"],
        "scoring": raw_data["game_config"]["scoring"],
    }


def run_ingestion(ingestion_data: dict[str, Any]) -> dict[str, int]:
    """Run the complete hourly ingestion in one database transaction.

    The transaction is committed only after every dataset succeeds. Any
    exception automatically rolls back all changes.
    """
    with SessionLocal.begin() as session:
        ingested = ingest_bootstrap_data(session, data=ingestion_data)
        counts = {
            name: len(records) if isinstance(records, list) else 1
            for name, records in ingested.items()
        }

    return counts


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    logger.info("Starting hourly FPL data ingestion")
    try:
        ingestion_data = get_ingestion_data()
        counts = run_ingestion(ingestion_data)
    except Exception:
        logger.exception("Hourly FPL data ingestion failed and was rolled back")
        raise

    logger.info("Hourly FPL data ingestion completed")
    for dataset, count in counts.items():
        logger.info("Ingested %s: %d", dataset, count)


if __name__ == "__main__":
    main()
