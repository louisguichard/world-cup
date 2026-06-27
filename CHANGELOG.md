# Changelog

## [4.0.0] — 2026-06-27

### Changed
- Major v4 release: universal team identity, live qualification standings seed, Mexico crest fix, hash navigation refactor, and build 22 feature set.

## [Unreleased]

### Builds
- **4.0.0 build 36** (2026-06-27): 1 file(s) in vercel.json — 1 file changed, 36 insertions(+), 36 deletions(-)
- **4.0.0 build 35** (2026-06-27): Fix vercel rewrite syntax for rapid proxy query passthrough
- **4.0.0 build 34** (2026-06-27): 7 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, vercel.json, version.json — 7 files changed, 76 insertions(+), 46 deletions(-)
- **4.0.0 build 33** (2026-06-27): Route RapidAPI rewrites through query params on api/rapid
- **4.0.0 build 32** (2026-06-27): 6 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, version.json — 6 files changed, 60 insertions(+), 40 deletions(-)
- **4.0.0 build 31** (2026-06-27): Flatten rapid and proxy to top-level Vercel API files
- **4.0.0 build 30** (2026-06-27): 6 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, version.json — 6 files changed, 15 insertions(+), 2 deletions(-)
- **4.0.0 build 29** (2026-06-27): Fix Vercel rapid proxy catch-all route naming
- **4.0.0 build 28** (2026-06-27): 31 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, src, vercel.json — 31 files changed, 509 insertions(+), 1001 deletions(-)
- **4.0.0 build 27** (2026-06-27): Consolidate RapidAPI proxies, boot ESPN bypass, cache migration, live results
- **4.0.0 build 26** (2026-06-27): 18 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, config, scripts, src — 18 files changed, 399 insertions(+), 49 deletions(-)
- **4.0.0 build 25** (2026-06-27): Wire Boggio Football Prediction v2 into WC sync and match index
- **4.0.0 build 24** (2026-06-27): Always show team names and flags; hide backend ids from UI
- **4.0.0 build 23** (2026-06-27): 10 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, public, src, vercel.json — 10 files changed, 59 insertions(+), 13 deletions(-)
- **4.0.0 build 22** (2026-06-27): Bust client caches (boot v4, SW v5, quota reset) and no-cache shell headers
- **4.0.0 build 21** (2026-06-27): 14 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, config, scripts — 14 files changed, 235 insertions(+), 22 deletions(-)
- **4.0.0 build 20** (2026-06-27): Add TVView RapidAPI IPTV source and wire API audit coverage
- **4.0.0 build 19** (2026-06-27): 19 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, config, scripts — 19 files changed, 828 insertions(+), 7 deletions(-)
- **4.0.0 build 18** (2026-06-27): Wire IPTV RapidAPI providers as stream fallback on match watch tab
- **4.0.0 build 17** (2026-06-27): 18 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, docs, scripts, src — 18 files changed, 666 insertions(+), 45 deletions(-)
- **4.0.0 build 16** (2026-06-27): Add quota governor and multi-source verification gates
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
