1. Initial repo design
```
fpl/
├── docker-compose.yml
├── backend/
│   ├── fpl_core/              # PURE. No framework imports. Ever.
│   │   ├── models.py          # frozen dataclasses: Player, Squad, Pick, MatchStats
│   │   ├── scoring.py         # score_player(stats, position) -> PointsBreakdown
│   │   ├── validation.py      # validate_squad(squad) -> list[Violation]
│   │   ├── autosubs.py        # resolve_autosubs(squad, minutes) -> Squad
│   │   ├── transfers.py       # free transfer bank, hit calculation
│   │   ├── chips.py           # wildcard/free hit/bench boost/triple captain
│   │   └── pricing.py         # sell price, price change thresholds
│   ├── app/
│   │   ├── db/                # SQLAlchemy models, repositories, Alembic
│   │   ├── api/               # FastAPI routers
│   │   ├── ingest/            # FPL API clients, snapshot jobs, event ingestion
│   │   ├── live/              # fan-out engine, WebSocket hub
│   │   ├── jobs/              # scheduler, deadline processing, finalisation
│   │   └── auth/              # sessions, password hashing
│   ├── sim/                   # simulation harness (see Phase 3)
│   └── tests/
│       ├── unit/              # fpl_core, no IO
│       ├── golden/            # ground-truth diff vs real FPL
│       └── integration/       # API + DB
└── frontend/
    └── src/
        ├── features/          # squad/, transfers/, leagues/, points/
        ├── components/
        └── api/               # generated types from OpenAPI schema
```