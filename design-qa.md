# Navigation and league pages QA

final result: passed

Scope: a reference-inspired makeover with the four requested destinations, retaining the existing Fantasy product. This is not a pixel-exact clone of all official PL functionality.

## Evidence

- User source: `/var/folders/45/9x8czf656y16dbbb50gp59p40000gn/T/codex-clipboard-e70d60d1-c459-42c7-9cba-6ebc8c92801c.png` (3840 × 2172); other supplied references cover navigation, Matches, and Table.
- Desktop: `/tmp/fpl-players-desktop.png`, `/tmp/fpl-table-desktop.png`, `/tmp/fpl-matches-desktop.png`, each captured at a 1440 × 1000 CSS viewport, output 1440 × 1000 pixels.
- Mobile: `/tmp/fpl-players-mobile.png`, 390 × 844 CSS viewport and output pixels.
- Source and desktop captures were opened together in one comparison input. Source viewer scaled to 2048 × 1158; comparison is by corresponding content regions rather than pixel registration. Official advertising, secondary links, follow controls, and nationality are outside this implementation's scope. Actual app data supplies rows, rather than screenshot transcription.
- Focused inspection: desktop navigation and first player rows are readable in the full capture; mobile capture exposes navigation, filter wrapping, portraits, names, clubs, and positions.

## Findings and iteration

1. P2, mobile player table: initial 590px minimum width clipped club and position details at 390px. Fixed by placing club text beneath the player name and retaining the position column on narrow screens. The revised mobile capture shows both columns with no page overflow.
2. Missing upstream player portraits initially left a blank space. Failed portrait requests now fall back to that player's existing club crest. Desktop recapture confirms the fallback for Adarabioyo.
3. No remaining P0/P1/P2 findings in the scoped makeover.

## Fidelity surfaces

- Typography: existing DM Sans and Outfit retained; bold purple navigation, clear large white titles, subdued column headers, and bold player names follow the reference hierarchy.
- Spacing/layout: light header, horizontal desktop navigation, aligned filters, rounded white tables and separated rows. Mobile navigation wraps into a dedicated second row. The official site's advertising region is intentionally omitted.
- Colors: purple text, pale neutral backgrounds, violet-to-cyan heading treatment, green wins and neutral draws match the supplied direction. Existing product tokens and components remain in Fantasy.
- Assets: existing PL brand and club crests reused; player portraits use the existing PL resource helper. No new generated assets were necessary.
- Copy/content: exactly Matches, Table, Fantasy, Players in main navigation. Current season comes from the API; directory defaults to surname ascending, 25 per page. Table explicitly describes its completed-fixture basis and absence of deductions.

## Interaction checks

- Players page 1 shows 1–25 of 653, page 2 shows 26–50, and search for Abbott returns Zach Abbott and resets to page 1. Reset restores the full directory.
- Matches opens matchweek 3; next changes to matchweek 4 with its fixtures.
- Table Home filter recalculates results (Man City: two played, six points).
- Fantasy opens the unchanged existing landing experience for a guest; existing authenticated routing is covered by tests.
- Browser error log checked: no captured errors.
- Production build and ESLint pass. Frontend: 56 tests passed. Backend: 114 tests passed, 95.05% coverage (95% required).

## Follow-up polish

- Reference contains extra features and assets outside the requested four-section scope (advertising, news, follow buttons, nationality and youth competitions).
- Standings support points, goal difference and goals-scored ordering; competition rulings and points deductions require a future authoritative standings source.
