import logging

from app.db.schema import SessionLocal
from app.ingest.ingest import ingest_initial_data


logger = logging.getLogger(__name__)


def run_initial_ingestion() -> dict[str, int]:
    """Run the complete initial ingestion in one database transaction.

    The transaction is committed only after every dataset succeeds. Any
    exception automatically rolls back all changes.
    """
    with SessionLocal.begin() as session:
        ingested = ingest_initial_data(session)
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

    logger.info("Starting initial FPL data ingestion")
    try:
        counts = run_initial_ingestion()
    except Exception:
        logger.exception("Initial FPL data ingestion failed and was rolled back")
        raise

    logger.info("Initial FPL data ingestion completed")
    for dataset, count in counts.items():
        logger.info("Ingested %s: %d", dataset, count)


if __name__ == "__main__":
    main()
