# Changelog

## [4.0.0] — 2026-06-27

### Changed
- Major v4 release: universal team identity, live qualification standings seed, Mexico crest fix, hash navigation refactor, and build 22 feature set.

## [Unreleased]

### Builds
- **4.0.0 build 15** (2026-06-27): 11 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 11 files changed, 197 insertions(+), 160 deletions(-)
- **4.0.0 build 14** (2026-06-27): Unify standings and simulation on canonical dataset
- **4.0.0 build 13** (2026-06-27): 15 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, config, scripts — 15 files changed, 570 insertions(+), 143 deletions(-)
- **4.0.0 build 12** (2026-06-27): Wire Boggio Football Prediction API v2 endpoints for match tips and accuracy stats
- **4.0.0 build 11** (2026-06-27): 14 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, public, src, version.json — 14 files changed, 512 insertions(+), 64 deletions(-)
- **4.0.0 build 10** (2026-06-27): Fix PWA install: early SW + beforeinstallprompt capture, one-tap install on desktop/Android
- **4.0.0 build 9** (2026-06-27): 14 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 14 files changed, 186 insertions(+), 61 deletions(-)
- **4.0.0 build 8** (2026-06-27): Full-app copy sweep via appCopy.ts; fix best-third race status labels
- **4.0.0 build 7** (2026-06-27): 9 file(s) in .cursor, CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 9 files changed, 141 insertions(+), 2 deletions(-)
- **4.0.0 build 6** (2026-06-27): Add uiDebugBridge for sweep; skip SVG collision false positives; 0-issue uidebug gate
- **4.0.0 build 5** (2026-06-27): Fix UI debug sweep scan bridge timing; archive sweep runs under .cursor/ui-debug-runs
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
