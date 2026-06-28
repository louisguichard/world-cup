# Changelog

## [4.0.0] — 2026-06-27

### Changed
- Major v4 release: universal team identity, live qualification standings seed, Mexico crest fix, hash navigation refactor, and build 22 feature set.

## [Unreleased]

### Builds
- **4.0.0 build 20** (2026-06-28): 3 file(s) in api, build-manifest.json, server — 3 files changed, 16 insertions(+), 15 deletions(-)
- **4.0.0 build 19** (2026-06-28): 254 file(s) in .cursor, .cursorrules, .env.example, CHANGELOG.md, VERSION_LOG.md, api — 254 files changed, 16735 insertions(+), 1121 deletions(-)
- **4.0.0 build 18** (2026-06-28): Live cards, weather, events, glow layout, and operational API routes
- **4.0.0 build 17** (2026-06-28): Phase 2/3 UX blueprint + monorepo packages, analyst frontend, admin console, cursor prompt pack, council synthesis
- **4.0.0 build 16** (2026-06-28): WC2026 Production Architecture: BC1/BC2/BC3 services, Prisma schema, BullMQ queues, SSE push, QueryAPI endpoints, OTel observability, React PWA SSE hook
- **4.0.0 build 15** (2026-06-28): fix groups tab crash: add error boundaries, harden tournament profile cache reader, fix TS errors
- **4.0.0 build 14** (2026-06-28): Give live hero glow room via bleed padding and visible overflow
- **4.0.0 build 13** (2026-06-28): Fix goal celebration banner overlap and layout shift on live cards
- **4.0.0 build 12** (2026-06-28): Yahoo Weather primary with canonical 16 host cities and icon badges
- **4.0.0 build 11** (2026-06-28): Fix live card events: remap ESPN team ids, show cards and subs
- **4.0.0 build 10** (2026-06-28): Unify live secondary cards with primary size and full match details
- **4.0.0 build 9** (2026-06-28): Skip SVG graphics false positives in UI debug scan
- **4.0.0 build 8** (2026-06-28): Allow live hero cards to grow; clip glow horizontally only
- **4.0.0 build 7** (2026-06-28): Fix Live view layout overflow and glow bleed collisions
- **4.0.0 build 6** (2026-06-28): Stack live secondary cards under hero at matching column width
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
