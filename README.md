# Fantasy Premier League Clone

A full-stack Fantasy Premier League application built with FastAPI, PostgreSQL,
SQLAlchemy, React, and TypeScript. The backend exposes FPL reference data through
a REST API and includes a repeatable ingestion pipeline for the bundled FPL
bootstrap dataset.

## Tech stack

- Backend: Python 3.12, FastAPI, SQLAlchemy 2, Alembic
- Database: PostgreSQL 17
- Frontend: React 19, TypeScript, Vite
- Local infrastructure: Docker Compose

## Project structure

```text
fpl/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes
│   │   ├── db/           # SQLAlchemy models and database session
│   │   ├── ingest/       # Bootstrap loading and ingestion pipeline
│   │   ├── models/       # Pydantic request/response models
│   │   └── services/     # Database query and application services
│   ├── data/             # Bundled FPL bootstrap JSON
│   ├── migrations/       # Alembic database migrations
│   └── main.py           # FastAPI application
├── frontend/             # React and Vite application
└── docker-compose.yml    # PostgreSQL and backend services
```

## Prerequisites

- Docker Desktop with Docker Compose
- Node.js and npm for the frontend
- Python 3.12 if running the backend outside Docker

## Environment configuration

The project uses two environment files:

- `/.env` supplies PostgreSQL container settings to Docker Compose.
- `/backend/.env` supplies database settings to the FastAPI backend.

Create them from the provided template:

```bash
cp backend/.env.copy .env
cp backend/.env.copy backend/.env
```

For local development, a suitable configuration is:

```dotenv
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5433
DB_NAME=fpl
DEBUG=true
```

Keep `DB_USER`, `DB_PASSWORD`, and `DB_NAME` identical in both files. Docker
automatically overrides the backend container's host to `db` and its internal
database port to `5432`.

Environment files are ignored by Git. Do not commit real credentials.

## Quick start

Run these commands from the repository root.

### 1. Start the application

```bash
docker compose up -d --build
```

This starts PostgreSQL, the FastAPI backend, the FPL sync worker, and the Vite
frontend. The backend waits for PostgreSQL, applies Alembic migrations, and
starts with automatic reload. The frontend starts after the backend health
check passes and supports hot module replacement.

Check that the API is running:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

Interactive API documentation is available at
[http://localhost:8000/docs](http://localhost:8000/docs).

The frontend is available at
[http://localhost:5173](http://localhost:5173). Requests under `/api` are
proxied from Vite to the backend container.

### 2. Ingest the initial FPL data

```bash
docker compose exec backend python -m app.ingest.initial_ingestion
```

The ingestion runs in one transaction and creates or updates:

- The 2026/27 season
- Positions and teams
- Players and player season statistics
- Gameweeks, phases, and chips
- Game rules and scoring rules

The pipeline is idempotent: running it again updates existing records instead
of inserting duplicates.

The `fpl-sync` worker then keeps the official bootstrap, fixture, and live
gameweek feeds current. It stores deadline squad snapshots and recalculates
points from the official per-player event totals, including captaincy, chips,
automatic substitutions, free transfers, and transfer hits. GW1 and GW2 are
created as explicitly marked backfilled snapshots from the current saved squad
so their point calculations can be checked; they are not claimed as historical
records of the user's actual lineups.

### 3. Sync the season's kit assets

Run this explicit job once near the start of each season, after updating the
saved bootstrap data:

```bash
cd frontend
npm run sync:kits
```

The command infers a folder such as `public/kits/2026-27` from gameweek
deadlines and downloads one outfield and one goalkeeper kit per team. It is
idempotent: valid local files are reused. Use `--force` to refresh every image,
or `--dry-run` to inspect the intended sync. You can override inference with
`npm run sync:kits -- --season 2026/27`.

Generated kit images and their manifest stay local and are ignored by Git. The
pitch displays a generic player placeholder when they are absent. Because the
images and club marks come from the official FPL host, review the Premier
League's current terms and permissions before use or redistribution.

### 4. Optional: run the frontend outside Docker

If you prefer to run the frontend directly on your machine, stop its container
and start Vite locally:

```bash
docker compose stop frontend
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally
[http://localhost:5173](http://localhost:5173).

## Accessing PostgreSQL

From the repository root, open a PostgreSQL shell inside the database
container:

```bash
docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Useful `psql` commands:

```sql
\dt
\d players
SELECT * FROM seasons;
SELECT COUNT(*) FROM players;
SELECT * FROM teams ORDER BY id LIMIT 10;
\q
```

Use `\q` to leave `psql`. Press `Ctrl+C` first if a query is currently running.

For a graphical client such as DBeaver, TablePlus, or pgAdmin, use:

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `DB_PORT` from `/.env` |
| Database | `DB_NAME` from `/.env` |
| Username | `DB_USER` from `/.env` |
| Password | `DB_PASSWORD` from `/.env` |

To display the mapped database port:

```bash
docker compose port db 5432
```

## API overview

All resource routes use the `/api/v1` prefix.

| Resource | Endpoint |
|---|---|
| Seasons | `/api/v1/seasons` |
| Teams | `/api/v1/teams?season_id=1` |
| Positions | `/api/v1/positions` |
| Players | `/api/v1/players?season_id=1` |
| Player season stats | `/api/v1/player-season-stats?season_id=1` |
| Gameweeks | `/api/v1/gameweeks?season_id=1` |
| Fixtures | `/api/v1/fixtures?season_id=1&gameweek_number=1` |
| My points history | `/api/v1/squads/me/points/history?season_id=1` |
| Phases | `/api/v1/phases?season_id=1` |
| Chips | `/api/v1/chips?season_id=1` |
| Game rules | `/api/v1/game-rules/by-season/1` |
| Scoring rules | `/api/v1/scoring-rules?season_id=1` |

Example:

```bash
curl 'http://localhost:8000/api/v1/players?season_id=1&limit=20'
```

## Running the backend without Docker

Start only PostgreSQL from the repository root:

```bash
docker compose up -d db
```

Then run the backend from `backend/`:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m alembic upgrade head
python -m app.ingest.initial_ingestion
uvicorn main:app --reload
```

Ensure `backend/.env` uses `DB_HOST=localhost` and the host port configured in
the root `.env` file.

## Common commands

Run Docker commands from the repository root:

```bash
docker compose ps
docker compose logs -f backend
docker compose restart backend
docker compose down
```

## Testing

The backend suite uses a fresh in-memory SQLite database for each test. It does
not require Docker and never modifies the development PostgreSQL database.

Run the backend tests from `backend/`:

```bash
cd backend
python -m pytest
```

Coverage is enabled by default. The suite fails if combined line and branch
coverage falls below 95%.

The backend tests cover:

- Request validation and response serialization
- Service CRUD, ordering, searching, filtering, and pagination
- Every FastAPI route, including validation and not-found responses
- Database constraints and session commit/rollback behavior
- Full bootstrap ingestion, reruns, foreign-key mapping, and failure cases
- Initial Alembic migration upgrade and downgrade behavior
- The executable initial-ingestion entry point

Run backend tests inside Docker with:

```bash
docker compose exec backend python -m pytest
```

Run frontend component tests from `frontend/`:

```bash
cd frontend
npm test
npm run test:coverage
```

The frontend suite uses Vitest, Testing Library, and jsdom. Coverage thresholds
are configured in `frontend/vitest.config.ts`.

Run frontend lint and production build checks from `frontend/`:

```bash
npm run lint
npm run build
```

## Database migrations

The Docker backend applies existing migrations automatically at startup.

To create a migration after changing the SQLAlchemy schema, run from
`backend/`:

```bash
python -m alembic revision --autogenerate -m "describe the schema change"
python -m alembic upgrade head
```

Inside Docker, use:

```bash
docker compose exec backend python -m alembic upgrade head
```

## Resetting local data

To stop the application while preserving PostgreSQL data:

```bash
docker compose down
```

To delete the PostgreSQL volume and start with an empty database:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend python -m app.ingest.initial_ingestion
```

`docker compose down -v` permanently removes the local database volume. Use it
only when you intend to discard all local data.
