# Building an FPL Clone — Build Plan (rev. 2)

Solo project, ~6 months at 10–15 hrs/week. FastAPI backend, React + TypeScript frontend.

**What changed from rev. 1:** the live `bootstrap-static` payload showed that FPL publishes
its own scoring table and squad rules as machine-readable config. That deletes a whole class
of "hardcode it and hope" work, and it corrected a mistake in my original scoring table.
Phase structure is also trimmed to match the repo you actually scaffolded.

---

## Where you are

```
fpl/
├── backend/     FastAPI, /api/health
└── frontend/    Vite + React + TS, proxying /api → :8000
```

That's the right starting point. Everything below builds on it.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | FastAPI | Already scaffolded |
| Database | PostgreSQL | Add in Phase 1. Needs transactions, JSONB, window functions |
| ORM / migrations | SQLAlchemy 2.0 + Alembic | Explicit, and you'll learn migrations properly |
| HTTP client | httpx | Async, matches FastAPI |
| Background jobs | A plain `asyncio` loop | ~40 lines. Swap for ARQ around Phase 6 if you outgrow it |
| Frontend | React + TS + Vite | Already scaffolded |
| Server state | TanStack Query | Add in Phase 4 |
| Testing | pytest + Hypothesis | Hypothesis matters more here than you'd expect |
| Local infra | Docker Compose | Just Postgres at first |
| CI | GitHub Actions | ruff + mypy + pytest |

**Hand-roll deliberately** (this is the learning): auth and sessions, the scheduler, ranking,
the price model, all validation.

**Don't hand-roll** (no learning, high pain): password hashing (argon2-cffi), TLS, DB drivers,
date maths (`zoneinfo`, never naive datetimes).

---

## The one architectural rule

**`fpl_core/` is pure Python with zero framework imports.** No SQLAlchemy, no FastAPI, no
Redis. Plain dataclasses in, plain dataclasses out. Scoring, validation, autosubs, transfer
rules, chips — all pure functions.

Everything else is an adapter. The DB layer loads rows and converts to domain objects; the API
layer converts domain objects to JSON.

This is what makes the simulator possible and the test suite fast. It's easy to violate by
accident — building a DB engine at module import is the classic way — so put a test in place
that imports `fpl_core` and asserts nothing heavy comes with it.

---

## Read the rules from the API, don't hardcode them

This is the biggest revision. `bootstrap-static` ships a `game_config` block containing the
actual scoring table and squad constraints. Load these into your domain config at ingest time
rather than typing them into your source.

**`game_config.scoring`** gives you:

```
long_play: 2                 short_play: 1
goals_scored:      GKP 10,  DEF 6,  MID 5,  FWD 4
assists: 3
clean_sheets:      GKP 4,   DEF 4,  MID 1,  FWD 0
goals_conceded:    GKP -1,  DEF -1, MID 0,  FWD 0
saves: 1           penalties_saved: 5      penalties_missed: -2
yellow_cards: -1   red_cards: -3           own_goals: -2
bonus: 1
defensive_contribution:  GKP 0, DEF 2, MID 2, FWD 2
```

Note **goalkeeper goals are worth 10**, not 6. My original table had that wrong — which is
precisely the argument for reading it from source.

Also note the `mng_*` fields (`mng_win`, `mng_clean_sheets`, etc.) are all zeroed, so the
Assistant Manager chip isn't active this season. The schema is still there, which tells you
FPL keeps retired scoring categories in place. Your parser should tolerate that.

**`game_settings`** gives you the squad rules:

```
squad_squadsize: 15          squad_squadplay: 11
squad_team_limit: 3          squad_total_spend: 1000
ui_currency_multiplier: 10   → cost 55 means £5.5m
transfers_sell_on_fee: 0.5   → the sell-price haircut
max_extra_free_transfers: 4  → so 1 + 4 = 5 banked FTs max
transfers_cap: 20            element_sell_at_purchase_price: false
sys_vice_captain_enabled: true
```

**`element_types`** gives you formation bounds:

| Position | In squad | Min starting | Max starting |
|---|---|---|---|
| GKP | 2 | 1 | 1 |
| DEF | 5 | 3 | 5 |
| MID | 5 | 2 | 5 |
| FWD | 3 | 1 | 3 |

Any starting XI satisfying those bounds and summing to 11 is legal.

**`chips`** gives you the two-set structure. Wildcard and Free Hit run events 2–19 and 20–38;
Bench Boost and Triple Captain run 1–19 and 20–38. Wildcard and Free Hit can't be played in
GW1 because transfers are already unlimited before the first deadline.

### What the API does *not* give you

Point *values* are published; **thresholds are not**. You still have to encode:

- Saves score 1 point per **3** saves
- Defensive contribution needs **10** CBIT for defenders, **12** CBIRT for midfielders and
  forwards (recoveries count for the latter), capped at 2 points
- The 60-minute appearance threshold **excludes stoppage time**
- Bonus is the top 3 by BPS, 3/2/1, with ties handled by awarding duplicates

Treat these as the small hardcoded core, and let the ground-truth diff in Phase 2 verify them.

---

## API update cadence

Different fields move on completely different clocks. Design your polling around this:

| Cadence | Fields |
|---|---|
| Seconds–minutes | `transfers_in_event`, `transfers_out_event`, `selected_by_percent`, `total_players` |
| Live during matches | `event_points`, `bps`, provisional `bonus`, cumulative stats |
| Daily ~01:30 UTC | `now_cost`, `cost_change_event`, `cost_change_start` |
| Whenever news breaks | `status`, `news`, `news_added`, `chance_of_playing_next_round` |
| At each deadline | `events[]` flags: `is_current`, `is_next`, `average_entry_score`, `chip_plays` |
| Post-match, hours–days | `finished` flips, then later `data_checked` |

That last row is the important one. The window between `finished` and `data_checked` is when
bonus finalizes and stats get revised. **Points change during it.** This is the entire reason
scoring must be a re-runnable function over stored events rather than an incrementing counter.

### Data quality warnings

The payload has real garbage in it. Parse defensively:

- **Pre-season stats are last season's carryover.** Right now Raya shows 3,330 minutes and 162
  points before a ball has been kicked in 2026/27. They reset at GW1. Don't treat them as
  current-season.
- **Player IDs are neither contiguous nor ordered.** New signings get high IDs slotted into
  their club's block — Bruno Guimarães is id 452, Tzolis is 557, both inside the Arsenal group.
- **Individual fields are sometimes nonsense.** Meslier currently shows 0 minutes and 11 goals.
- **Fields appear and disappear between seasons.** Default missing keys rather than raising.
  A capture job that crashes on an unexpected payload loses data permanently.

---

## Data model

### Reference data

```
season(id, name, start_date, current_gameweek_id)
team(id, season_id, name, short_name, code, strength_overall_home, strength_overall_away)
player(id, season_id, team_id, web_name, first_name, second_name, position)
gameweek(id, season_id, number, deadline_at, finished, data_checked,
         average_entry_score, highest_score)
fixture(id, gameweek_id, home_team_id, away_team_id, kickoff_at,
        home_score, away_score, finished, difficulty_home, difficulty_away)
game_config(season_id, captured_at, scoring JSONB, settings JSONB, element_types JSONB)
```

That last table is new in this revision: version the rules themselves, so a mid-season tweak
doesn't silently invalidate your historical scoring.

### Time series

```
player_snapshot(player_id, captured_at, now_cost, cost_change_event, cost_change_start,
                transfers_in_event, transfers_out_event, selected_by_percent,
                status, chance_of_playing_next_round, news, event_points, total_points, form)
  PRIMARY KEY (player_id, captured_at)

raw_snapshot(id, endpoint, captured_at, payload_sha256, payload_gzip)
```

`raw_snapshot` is insurance — gzipped, deduplicated by hash, ~300 KB per capture. In two months
you'll want a field you didn't parse today. Prices are integers in tenths (`55` = £5.5m); never
floats, since you compare them for equality.

### Match events — source of truth for scoring

```
player_fixture_stat(id, fixture_id, player_id, revision, ingested_at,
                    minutes, goals_scored, assists, clean_sheet, goals_conceded,
                    own_goals, penalties_saved, penalties_missed, yellow_cards,
                    red_cards, saves, bonus, bps, defensive_contribution,
                    clearances_blocks_interceptions, recoveries, tackles,
                    raw_payload JSONB)
  UNIQUE (fixture_id, player_id, revision)
```

Append-only, highest revision wins. Never `UPDATE`. When an assist is removed three days later,
you write revision 2 and recompute.

### Managers

```
app_user(id, email, password_hash, created_at)

entry(id, user_id, season_id, name, created_at,
      cached_total_points, cached_overall_rank, cached_team_value, cached_bank)

squad_version(id, entry_id, gameweek_id, created_at, is_active, chip_played,
              free_transfers_available, transfers_made, points_hit)
  -- append-only; unique partial index on (entry_id, gameweek_id) where is_active

squad_pick(squad_version_id, player_id, slot,   -- 1-11 starting XI, 12-15 bench order
           is_captain, is_vice, purchase_price, sell_price)

transfer(id, entry_id, gameweek_id, player_out_id, player_in_id,
         price_out, price_in, made_at)

gameweek_result(entry_id, gameweek_id, points, bench_points, transfers_cost,
                gw_rank, overall_rank, team_value, bank, chip_played, computed_at)

league(id, name, creator_entry_id, join_code, start_gameweek, created_at)
league_membership(league_id, entry_id, joined_at)
```

**The critical property:** `squad_version` is append-only and immutable once its deadline
passes. You never update a team, you write a new version. This makes Free Hit trivial, history
correct, and concurrent transfers safe.

Every `cached_*` column needs a comment naming the function that recomputes it. Cached values
nobody can regenerate become permanent lies.

---

## Edge cases to write tests for

These are the ones a straightforward implementation gets wrong. Write the test before the code.

- **Clean sheet** needs 60+ minutes *and* no goal conceded **while the player was on the pitch**.
  Subbed off at 70' in a 0-0 that finishes 0-1 still earns it.
- **Goals conceded** likewise only counts goals conceded while on the pitch, accruing −1 per 2
  across the whole match.
- **The 60-minute threshold excludes stoppage time.**
- **Second yellow** — the player takes both the yellow and the red penalty. Verify against real
  data rather than trusting me.
- **Bonus is provisional during play** and finalizes later. Live and final scores legitimately
  differ.
- **Captain fallback:** captain plays 0 minutes → vice takes the armband. Both 0 → no multiplier.
- **Autosubs** fire only for starters with exactly 0 minutes, in bench order, only where the
  result is a legal formation. Goalkeepers substitute only goalkeepers, and a subbed-in player
  never inherits the captaincy.
- **Bench Boost disables autosubs** — all 15 already count.
- **Blank and double gameweeks:** a player may have zero or two fixtures in a gameweek. Sum
  across fixtures; never assume one.
- **Sell price ≠ market price:** purchase price plus half the rise, rounded down. A player has
  three simultaneous prices — market, purchase, sell.
- **Free transfer bank:** `min(bank − used + 1, 5)`, extras cost −4.

---

## Phases

Each has a definition of done. Don't start the next until it's green.

### Phase 0 — Capture (this week)

Add Postgres via Docker Compose, Alembic, and the two snapshot tables. Write the hourly
snapshot job and get it running.

Hourly rather than daily: price changes fire around 01:30 UTC, and the transfer counts in the
hours immediately beforehand are exactly the signal the Phase 7 price model learns from.

Add CI at the same time — ruff, mypy, pytest on every push.

**DoD:** snapshots landing on schedule; `/api/health` reports `latest_snapshot_at`.

### Phase 1 — Domain core (weeks 2–4)

Pure `fpl_core`. Scoring (driven by the ingested `game_config`), squad validation, autosub
resolution, captain fallback, transfer arithmetic, chip semantics, sell price.

**DoD:** 150+ unit tests running in under 5 seconds, with a named test for every edge case above.

### Phase 2 — Ingestion and ground truth (weeks 5–6)

Clients for `bootstrap-static/`, `fixtures/`, `element-summary/{id}/`, `event/{gw}/live/`.
Ingest a complete past season, then run your scoring engine over every player in every gameweek
and diff against the points FPL actually awarded.

**This is the most important gate in the project.** You're cloning a system that publishes its
own answer key. It will catch errors your reasoning never would — including whichever of my
edge-case claims above turn out to be wrong.

**DoD:** zero discrepancies across all 38 gameweeks, every player. Not "close." Zero. Keep it as
a permanent regression test.

### Phase 3 — Simulator (week 7)

A fake match-event generator and a controllable clock. Advance time, fire deadlines, produce
plausible stats, apply price drift, finalize gameweeks.

You cannot develop this app against real football — matches happen three times a week, and if
testing an autosub means waiting until Saturday you'll ship nothing.

**DoD:** a synthetic 38-gameweek season runs in under 10 seconds with deadlines, autosubs, price
changes and the GW19 chip boundary all firing.

### Phase 4 — API and UI for one user (weeks 8–13)

FastAPI over the domain core: squad creation, transfers, XI selection, captaincy, deadline
enforcement, append-only versioning. One hardcoded user, no auth.

Deadline enforcement is the hard part — 18:29:59 and 18:30:01 belong to different gameweeks, and
two concurrent transfer requests must not both spend the same free transfer. Row-level locking.

Then the frontend: pitch view (formation layout, drag bench order, tap to captain), transfer
market (filter by position/club/price, sortable), points breakdown, history chart. Generate TS
types from the OpenAPI schema.

**DoD:** play a full simulated season through the UI.

### Phase 5 — Multi-user and leagues (weeks 14–16)

Hand-rolled auth: registration, argon2, HttpOnly SameSite cookies, CSRF, login rate limiting.
Classic leagues with join codes, standings, tiebreakers.

**DoD:** 50 seeded users through a simulated season, leagues ranked correctly.

### Phase 6 — Live scoring (weeks 17–20)

Poll `event/{gw}/live/` during matches, diff against last state, emit change events. Build an
inverted index `player_id → [entry_ids]` and apply point deltas incrementally — recomputing all
squads per event is O(events × entries) and dies immediately. Push over WebSockets. Ranking
needs bucketed approximation plus periodic full recompute.

**DoD:** p99 under 500ms from ingest to client update with 10,000 seeded entries.

### Phase 7 — Price engine and production (weeks 21–24)

FPL's price algorithm is undisclosed — net transfers relative to ownership, firing ~01:30 UTC.
You'll have months of snapshots by now. Fit a threshold model and validate against observed
changes.

Then deploy: TLS, automated Postgres backups with a *tested* restore, Sentry, structured logs,
health checks, and an alert on `latest_snapshot_at` going stale.

**DoD:** survives a real gameweek unattended, with monitoring to prove it.

---

## Testing

- **Unit** (`fpl_core`, no IO) — the bulk. Fast enough that you actually run them.
- **Property-based** (Hypothesis) — highest value here. Assert invariants: no sequence of legal
  transfers yields an invalid squad; autosub resolution always returns a legal formation; sell
  price never exceeds market price.
- **Golden** — the Phase 2 diff, in CI forever.
- **Integration** — API against real Postgres, covering deadline boundaries and concurrent
  transfers. Fire two simultaneous transfers and assert exactly one succeeds; this class of bug
  is invisible in manual testing and fatal in production.
- **E2E** (Playwright) — a handful of critical paths only.

---

## Non-goals for v1

Write these down and defend them: no mobile app, no payments, no H2H leagues or cups, no draft
mode, no social feed, no AI features, no i18n.

## Failure modes, in order of likelihood

1. **Building auth first.** It feels like starting an app. It's the least interesting part and
   it delays every real problem. Phase 5, not Phase 1.
2. **Skipping the simulator.** You'll tell yourself you'll test against real matches. You won't.
3. **Skipping the ground-truth diff.** Then you never learn your scoring is subtly wrong.
4. **Starting the UI too early.** The domain model will shift and you'll rebuild it three times.
5. **Adding anything from the non-goals list.**

If you fall behind, cut Phases 6 and 7 before anything else. A correct, well-tested single-user
season is a far better project than a feature-complete one on an unverified scoring engine.
