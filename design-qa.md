# Gameweek player sidebar QA

final result: passed

## Scope

Show a compact gameweek points sidebar when a viewed squad player has played,
and retain the full player profile for players who have not played.

## Evidence

- User reference: `/var/folders/45/9x8czf656y16dbbb50gp59p40000gn/T/codex-clipboard-7f9ca287-4c15-4dbf-9503-7b1dd1afa1a4.png`.
- Live local squad inspected on `/squad` for Gameweek 3.
- Played case: David Raya, Arsenal 2–1 Chelsea, 3 points.
- Unplayed case: Jurriën Timber, with the existing full profile shown.
- Narrow browser viewport: 678 × 1118 CSS pixels.
- Desktop behavior is covered by the fixed 430px panel layout and the full
  responsive component test suite.

## Visual findings

1. The compact drawer follows the reference hierarchy: player name, result
   card, points breakdown, and a persistent full-profile action.
2. Club crests, team names, final score, and fixture status remain legible in
   the narrow layout.
3. Breakdown columns align statistic, value, and awarded points, with a clear
   total row.
4. The overlay and narrow drawer preserve the established Premier League color,
   radius, type, and elevation system.
5. No P0, P1, or P2 visual or interaction findings remain.

## Interaction and data checks

- A player marked as played opens the gameweek points breakdown.
- An unplayed player opens the normal full profile directly.
- “View full profile” switches from the breakdown to the normal profile.
- The close button and backdrop continue to dismiss both drawer states.
- The backend uses stored gameweek stats and season scoring rules; breakdown
  rows reconcile to the official player total.
- Backend: 116 tests passed with 95.02% coverage.
- Frontend: 62 tests passed; ESLint and the production build passed.
