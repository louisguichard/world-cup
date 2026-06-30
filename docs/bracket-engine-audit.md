# World Cup 2026 Bracket Engine Audit

Canonical bracket definitions:

- **`src/data/world_cup_2026_knockout_bracket.json`** — official source of truth (user-provided FIFA WC 2026 knockout bracket)
- **`src/lib/brackets/knockoutBracketJson.ts`** — parser that normalizes JSON → seed codes + feeder wiring
- **`src/lib/brackets/bracketProgression.ts`** — hardwired TypeScript mirror (must match parser output)

Regression tests in `bracketProgression.test.ts` assert the TypeScript constants match the JSON file on every run.

## Round of 32

| Match | Home | Away |
|-------|------|------|
| M73 | 1A | 3E |
| M74 | 1B | 3J |
| M75 | 1D | 3B |
| M76 | 1E | 3D |
| M77 | 1G | 3I |
| M78 | 1I | 3F |
| M79 | 1K | 3L |
| M80 | 1L | 3K |
| M81 | 2A | 2B |
| M82 | 2D | 2G |
| M83 | 2K | 2L |
| M84 | 1H | 2J |
| M85 | 1C | 2F |
| M86 | 1F | 3C |
| M87 | 1J | 3H |
| M88 | 2E | 2I |

Third-place seeds use explicit group letters (`3E`, `3D`, …). Resolved in `getR32Slots` via the group's third-place finisher when qualified.

## R16 feeders (hardwired)

| Match | Home | Away |
|-------|------|------|
| M89 | W74 | W77 |
| M90 | W73 | W75 |
| M91 | W76 | W78 |
| M92 | W79 | W80 |
| M93 | W83 | W84 |
| M94 | W81 | W82 |
| M95 | W86 | W88 |
| M96 | W85 | W87 |

QF/SF/Final progression matches the JSON `bracket_progression` block.

## Regression tests

`bracketProgression.test.ts` asserts `ROUND_OF_32_FIXTURES` and `KNOCKOUT_ROUND_FIXTURES.R16` match the JSON file byte-for-byte on seed labels.

## Note on `matchSchedule.json`

Bundled ESPN schedule placeholders may still disagree with this JSON for some match numbers. Runtime bracket logic uses `bracketProgression.ts` / the JSON file, not schedule JSON placeholders.
