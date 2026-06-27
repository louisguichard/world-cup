# Changelog

## [4.0.0] — 2026-06-27

### Changed
- Major v4 release: universal team identity, live qualification standings seed, Mexico crest fix, hash navigation refactor, and build 22 feature set.

## [Unreleased]

### Builds
- **4.0.0 build 4** (2026-06-27): 16 file(s) in scripts, src — 16 files changed, 374 insertions(+), 205 deletions(-)
- **4.0.0 build 3** (2026-06-27): Pause UI debug live scan when viewport sim width mismatches browser; pin sim meta viewport
- **4.0.0 build 2** (2026-06-27): 4 file(s) in src — 4 files changed, 16 insertions(+), 7 deletions(-)

## [3.0.0] — 2026-06-27

### Changed
- V3 — unified multi-API match detail (stats, lineups, commentary, H2H)
- Live kickoff countdown, trophy branding refresh, and full deploy hardening
- WC2026, WC Live, Zafronix, SofaScore, ESPN, and World Cup history integrations

All notable releases of **Road to the World Cup Final 2026**.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
For every build increment (not just semver releases), see [VERSION_LOG.md](./VERSION_LOG.md).

## [2.0.0] — 2026-06-26

### Added

- Strict version and build tracking via `version.json`, `scripts/version.mjs`, and `npm run version:*` commands
- Canonical branding module (`src/config/appMeta.ts`) used across UI surfaces
- Host-city venue hub with enrichment data, popover metadata, and `#venue/{slug}` deep links
- SofaScore-style match detail page (`#match/{id}`) with summary, stats, lineups, commentary, and H2H tabs
- Tournament tab with matches, standings, bracket, and stats sub-views
- Bracket slot certainty (confirmed / projected / ghost) in projected and confirmed bracket modes
- Results tab, groups table toggle, team match history, and smart schedule grouping
- Unified API layer with feature flags, dev proxies, and API audit canvas

### Changed

- Product branding unified to **Road to the World Cup Final 2026** (replacing mixed "World Cup Lab" / "Tracker" naming in user-facing UI)
- README rewritten for v2 scope, setup, and versioning workflow
- Jumped from `0.1.0` to `2.0.0` to mark the controlled-release era

### Deprecated

- Ad-hoc version references in copy; use `APP_BRAND` and `formatVersionLabel()` instead
