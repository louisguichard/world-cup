# Changelog

## [Unreleased]

### Builds
- **3.0.0 build 18** (2026-06-27): 8 file(s) in build-manifest.json, src — 8 files changed, 240 insertions(+), 10 deletions(-)
- **3.0.0 build 17** (2026-06-27): 8 file(s) in src — 8 files changed, 157 insertions(+), 33 deletions(-)
- **3.0.0 build 16** (2026-06-27): 13 file(s) in .cursor, src — 13 files changed, 415 insertions(+), 11 deletions(-)
- **3.0.0 build 15** (2026-06-27): 3 file(s) in build-manifest.json, src — 3 files changed, 24 insertions(+), 4 deletions(-)
- **3.0.0 build 14** (2026-06-27): 6 file(s) in build-manifest.json, src — 6 files changed, 66 insertions(+), 19 deletions(-)
- **3.0.0 build 13** (2026-06-27): 87 file(s) in .cursor, .githooks, build-manifest.json, docs, package.json, public — 87 files changed, 4970 insertions(+), 900 deletions(-)
- **3.0.0 build 12** (2026-06-27): Auto version pipeline: git hooks, build-manifest, release dashboard canvas, CHANGELOG [Unreleased] builds, agent rule + version-bump skill

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
