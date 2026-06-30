# Version Log

Detailed chronological record of every version and build increment.

Use `npm run version:build -- --message "what changed"` after each meaningful change set.  
Use `npm run version:patch|minor|major` for semver releases.











































































































## [4.0.0] build 85 — 2026-06-30 (build)
- 10 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 10 files changed, 78 insertions(+), 63 deletions(-)

## [4.0.0] build 84 — 2026-06-30 (build)
- polish bracket knockout copy, connector CSS, live feeder highlights

## [4.0.0] build 83 — 2026-06-30 (build)
- 21 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 21 files changed, 643 insertions(+), 118 deletions(-)

## [4.0.0] build 82 — 2026-06-30 (build)
- fix bracket live scores, LOCKED IN badge, connector slot layout

## [4.0.0] build 81 — 2026-06-30 (build)
- fix live ET period label, penalty bar visibility, goal event fetch

## [4.0.0] build 80 — 2026-06-30 (build)
- 1 file(s) in src — 1 file changed, 42 insertions(+), 7 deletions(-)

## [4.0.0] build 79 — 2026-06-30 (build)
- 21 file(s) in src — 21 files changed, 868 insertions(+), 233 deletions(-)

## [4.0.0] build 78 — 2026-06-30 (build)
- 29 file(s) in public, src — 29 files changed, 226 insertions(+), 58 deletions(-)

## [4.0.0] build 77 — 2026-06-30 (build)
- 260 file(s) in build-manifest.json, index.html, package.json, public, src, tools — 260 files changed, 1993 insertions(+), 330 deletions(-)

## [4.0.0] build 76 — 2026-06-30 (build)
- 18 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 18 files changed, 545 insertions(+), 64 deletions(-)

## [4.0.0] build 75 — 2026-06-30 (build)
- Stamp real knockout results into bracket projection; add tournament phase config

## [4.0.0] build 74 — 2026-06-30 (build)
- 22 file(s) in src — 22 files changed, 870 insertions(+), 77 deletions(-)

## [4.0.0] build 73 — 2026-06-28 (build)
- 30 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, docs, src, version.json — 30 files changed, 881 insertions(+), 404 deletions(-)

## [4.0.0] build 72 — 2026-06-28 (build)
- Phase 1 frontend perf + Phase 2 performance architecture doc

## [4.0.0] build 71 — 2026-06-28 (build)
- Frontend perf: polling governor, SSE cleanup, panel error boundaries

## [4.0.0] build 70 — 2026-06-28 (build)
- 69 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, package.json, packages — 69 files changed, 5149 insertions(+), 63 deletions(-)

## [4.0.0] build 69 — 2026-06-28 (build)
- Fix Vercel deploy: @vercel/node, nodejs runtime, BC2 bridge types

## [4.0.0] build 68 — 2026-06-28 (build)
- 75 file(s) in .env.example, .gitignore, .npmrc, CHANGELOG.md, VERSION_LOG.md, api — 75 files changed, 8189 insertions(+), 7827 deletions(-)

## [4.0.0] build 67 — 2026-06-28 (build)
- Fix knockout placeholders stored as teamId; resolve from standings on schedule overlay

## [4.0.0] build 66 — 2026-06-28 (build)
- Resolve knockout schedule from standings; finalize group tables in store

## [4.0.0] build 65 — 2026-06-28 (build)
- Reliable server:dev env loading via run-server-dev.mjs; richer workers_skipped diagnostics

## [4.0.0] build 64 — 2026-06-28 (build)
- Fix blank web app: stop bundling node:crypto inputHash into browser; fix analyst import paths

## [4.0.0] build 63 — 2026-06-28 (build)
- stack:wait + stack:bootstrap for Postgres readiness after compose up

## [4.0.0] build 62 — 2026-06-28 (build)
- Server loads .env.local; admin API proxy to 3001; clarify dev server blocking

## [4.0.0] build 61 — 2026-06-28 (build)
- Graceful EADDRINUSE on server:dev; add server:stop script

## [4.0.0] build 60 — 2026-06-28 (build)
- Remove debug instrumentation from smoke-stack script

## [4.0.0] build 59 — 2026-06-28 (build)
- Fix pnpm exec version clash; smoke-stack skips when Docker daemon down

## [4.0.0] build 58 — 2026-06-28 (build)
- Prisma config fallback URL for generate without DATABASE_URL

## [4.0.0] build 57 — 2026-06-28 (build)
- Prisma 7 config, qual engine in package, Clerk auth, pnpm workspace, smoke:stack

## [4.0.0] build 56 — 2026-06-28 (build)
- HTTP-only server:dev with lazy Redis/Prisma, Hono QueryAPI, tsx runner

## [4.0.0] build 55 — 2026-06-28 (build)
- 17 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, docs, package.json — 17 files changed, 595 insertions(+), 31 deletions(-)

## [4.0.0] build 54 — 2026-06-28 (build)
- Fix smoke-db and verify-db Prisma import graceful handling

## [4.0.0] build 53 — 2026-06-28 (build)
- Restore BC API routes, Vite dev API middleware, catalog qual fallback

## [4.0.0] build 52 — 2026-06-28 (build)
- 17 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, docs, package.json, packages — 17 files changed, 451 insertions(+), 25 deletions(-)

## [4.0.0] build 51 — 2026-06-28 (build)
- Status contract, prediction panel, SSE poll gate, smoke test, local-dev docs

## [4.0.0] build 50 — 2026-06-28 (build)
- 13 file(s) in .env.example, CHANGELOG.md, VERSION_LOG.md, apps, build-manifest.json, src — 13 files changed, 209 insertions(+), 51 deletions(-)

## [4.0.0] build 49 — 2026-06-28 (build)
- Fix remaining tests, Meteosource normalize module, admin token client, qual standings test ids

## [4.0.0] build 48 — 2026-06-28 (build)
- 25 file(s) in .cursor, CHANGELOG.md, VERSION_LOG.md, build-manifest.json, package.json, server — 25 files changed, 1197 insertions(+), 47 deletions(-)

## [4.0.0] build 47 — 2026-06-28 (build)
- Move staging serverless routes out of Vercel deploy path

## [4.0.0] build 46 — 2026-06-28 (build)
- Execute phases 1-6: local stack, identity unify, qual bridge, UI wiring, admin token gate, smoke pipeline; resolve merge conflicts

## [4.0.0] build 45 — 2026-06-28 (build)
- 244 file(s) in .cursor, .env.example, AGENTS.md, CHANGELOG.md, VERSION_LOG.md, api — 244 files changed, 87284 insertions(+), 2461 deletions(-)

## [4.0.0] build 44 — 2026-06-27 (build)
- 19 file(s) in .cursor, CHANGELOG.md, VERSION_LOG.md, build-manifest.json, package.json, scripts — 19 files changed, 71658 insertions(+), 206 deletions(-)

## [4.0.0] build 43 — 2026-06-27 (build)
- Fix standings/third-place from ESPN; refresh audit snapshot and boot cache v6

## [4.0.0] build 42 — 2026-06-27 (build)
- Sync match schedule from ESPN; bump boot cache v5 for fresh standings

## [4.0.0] build 41 — 2026-06-27 (build)
- Remove duplicate sofascore6 rewrite; document Getty/YouTube env vars

## [4.0.0] build 40 — 2026-06-27 (build)
- Integrate all feature branches via consolidated rapid proxy

## [4.0.0] build 39 — 2026-06-27 (build)
- 13 file(s) in api, config, package.json, scripts, src, vercel.json — 13 files changed, 784 insertions(+), 2 deletions(-)

## [4.0.0] build 38 — 2026-06-27 (build)
- 7 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, vercel.json, version.json — 7 files changed, 56 insertions(+), 45 deletions(-)

## [4.0.0] build 37 — 2026-06-27 (build)
- Use path query param for Vercel rapid rewrites

## [4.0.0] build 36 — 2026-06-27 (build)
- 1 file(s) in vercel.json — 1 file changed, 36 insertions(+), 36 deletions(-)

## [4.0.0] build 35 — 2026-06-27 (build)
- Fix vercel rewrite syntax for rapid proxy query passthrough

## [4.0.0] build 34 — 2026-06-27 (build)
- 7 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, vercel.json, version.json — 7 files changed, 76 insertions(+), 46 deletions(-)

## [4.0.0] build 33 — 2026-06-27 (build)
- Route RapidAPI rewrites through query params on api/rapid

## [4.0.0] build 32 — 2026-06-27 (build)
- 6 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, version.json — 6 files changed, 60 insertions(+), 40 deletions(-)

## [4.0.0] build 31 — 2026-06-27 (build)
- Flatten rapid and proxy to top-level Vercel API files

## [4.0.0] build 30 — 2026-06-27 (build)
- 6 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, version.json — 6 files changed, 15 insertions(+), 2 deletions(-)

## [4.0.0] build 29 — 2026-06-27 (build)
- Fix Vercel rapid proxy catch-all route naming

## [4.0.0] build 28 — 2026-06-27 (build)
- 31 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, src, vercel.json — 31 files changed, 509 insertions(+), 1001 deletions(-)

## [4.0.0] build 27 — 2026-06-27 (build)
- Consolidate RapidAPI proxies, boot ESPN bypass, cache migration, live results

## [4.0.0] build 26 — 2026-06-27 (build)
- 18 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, config, scripts, src — 18 files changed, 399 insertions(+), 49 deletions(-)

## [4.0.0] build 25 — 2026-06-27 (build)
- Wire Boggio Football Prediction v2 into WC sync and match index

## [4.0.0] build 24 — 2026-06-27 (build)
- Always show team names and flags; hide backend ids from UI

## [4.0.0] build 23 — 2026-06-27 (build)
- 10 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, public, src, vercel.json — 10 files changed, 59 insertions(+), 13 deletions(-)

## [4.0.0] build 22 — 2026-06-27 (build)
- Bust client caches (boot v4, SW v5, quota reset) and no-cache shell headers

## [4.0.0] build 21 — 2026-06-27 (build)
- 14 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, config, scripts — 14 files changed, 235 insertions(+), 22 deletions(-)

## [4.0.0] build 20 — 2026-06-27 (build)
- Add TVView RapidAPI IPTV source and wire API audit coverage

## [4.0.0] build 19 — 2026-06-27 (build)
- 19 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, config, scripts — 19 files changed, 828 insertions(+), 7 deletions(-)

## [4.0.0] build 18 — 2026-06-27 (build)
- Wire IPTV RapidAPI providers as stream fallback on match watch tab

## [4.0.0] build 17 — 2026-06-27 (build)
- 18 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, docs, scripts, src — 18 files changed, 666 insertions(+), 45 deletions(-)

## [4.0.0] build 16 — 2026-06-27 (build)
- Add quota governor and multi-source verification gates

## [4.0.0] build 15 — 2026-06-27 (build)
- 11 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 11 files changed, 197 insertions(+), 160 deletions(-)

## [4.0.0] build 14 — 2026-06-27 (build)
- Unify standings and simulation on canonical dataset

## [4.0.0] build 13 — 2026-06-27 (build)
- 15 file(s) in CHANGELOG.md, VERSION_LOG.md, api, build-manifest.json, config, scripts — 15 files changed, 570 insertions(+), 143 deletions(-)

## [4.0.0] build 12 — 2026-06-27 (build)
- Wire Boggio Football Prediction API v2 endpoints for match tips and accuracy stats

## [4.0.0] build 11 — 2026-06-27 (build)
- 14 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, public, src, version.json — 14 files changed, 512 insertions(+), 64 deletions(-)

## [4.0.0] build 10 — 2026-06-27 (build)
- Fix PWA install: early SW + beforeinstallprompt capture, one-tap install on desktop/Android

## [4.0.0] build 9 — 2026-06-27 (build)
- 14 file(s) in CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 14 files changed, 186 insertions(+), 61 deletions(-)

## [4.0.0] build 8 — 2026-06-27 (build)
- Full-app copy sweep via appCopy.ts; fix best-third race status labels

## [4.0.0] build 7 — 2026-06-27 (build)
- 9 file(s) in .cursor, CHANGELOG.md, VERSION_LOG.md, build-manifest.json, src, version.json — 9 files changed, 141 insertions(+), 2 deletions(-)

## [4.0.0] build 6 — 2026-06-27 (build)
- Add uiDebugBridge for sweep; skip SVG collision false positives; 0-issue uidebug gate

## [4.0.0] build 5 — 2026-06-27 (build)
- Fix UI debug sweep scan bridge timing; archive sweep runs under .cursor/ui-debug-runs

## [4.0.0] build 4 — 2026-06-27 (build)
- 16 file(s) in scripts, src — 16 files changed, 374 insertions(+), 205 deletions(-)

## [4.0.0] build 3 — 2026-06-27 (build)
- Pause UI debug live scan when viewport sim width mismatches browser; pin sim meta viewport

## [4.0.0] build 2 — 2026-06-27 (build)
- 4 file(s) in src — 4 files changed, 16 insertions(+), 7 deletions(-)

## [4.0.0] build 1 — 2026-06-27 (major)
- Major v4 release: universal team identity, live qualification standings seed, Mexico crest fix, hash navigation refactor, and build 22 feature set.

## [3.0.0] build 22 — 2026-06-27 (build)
- 14 file(s) in build-manifest.json, src — 14 files changed, 436 insertions(+), 191 deletions(-)

## [3.0.0] build 21 — 2026-06-27 (build)
- 2 file(s) in build-manifest.json, src — 2 files changed, 11 insertions(+), 3 deletions(-)

## [3.0.0] build 20 — 2026-06-27 (build)
- 21 file(s) in build-manifest.json, scripts, src — 21 files changed, 348 insertions(+), 56 deletions(-)

## [3.0.0] build 19 — 2026-06-27 (build)
- 8 file(s) in build-manifest.json, src — 8 files changed, 187 insertions(+), 19 deletions(-)

## [3.0.0] build 18 — 2026-06-27 (build)
- 8 file(s) in build-manifest.json, src — 8 files changed, 240 insertions(+), 10 deletions(-)

## [3.0.0] build 17 — 2026-06-27 (build)
- 8 file(s) in src — 8 files changed, 157 insertions(+), 33 deletions(-)

## [3.0.0] build 16 — 2026-06-27 (build)
- 13 file(s) in .cursor, src — 13 files changed, 415 insertions(+), 11 deletions(-)

## [3.0.0] build 15 — 2026-06-27 (build)
- 3 file(s) in build-manifest.json, src — 3 files changed, 24 insertions(+), 4 deletions(-)

## [3.0.0] build 14 — 2026-06-27 (build)
- 6 file(s) in build-manifest.json, src — 6 files changed, 66 insertions(+), 19 deletions(-)

## [3.0.0] build 13 — 2026-06-27 (build)
- 87 file(s) in .cursor, .githooks, build-manifest.json, docs, package.json, public — 87 files changed, 4970 insertions(+), 900 deletions(-)

## [3.0.0] build 12 — 2026-06-27 (build)
- Auto version pipeline: git hooks, build-manifest, release dashboard canvas, CHANGELOG [Unreleased] builds, agent rule + version-bump skill

## [3.0.0] build 10 — 2026-06-27 (build)
- (no message provided)

## [3.0.0] build 9 — 2026-06-27 (build)
- Player photos, module refresh, tiered polling, lineup portraits

## [3.0.0] build 8 — 2026-06-27 (build)
- Live dashboard shadow bleed so glow halos and feather edges no longer clip on desktop

## [3.0.0] build 7 — 2026-06-27 (build)
- Cache-first boot, incremental polls, lazy live sections

## [3.0.0] build 6 — 2026-06-27 (build)
- Visual UI debug mode: viewport simulation (mobile/desktop), layout boundaries, overflow scan, and dev toolbar.

## [3.0.0] build 5 — 2026-06-27 (build)
- Mobile fast boot, WC2026 team catalog, odds display, team betting panel, and UI polish

## [3.0.0] build 4 — 2026-06-27 (build)
- Unified navigateToTab helper, compact top bar, home buttons on match/venue overlays

## [3.0.0] build 3 — 2026-06-27 (build)
- Migrate SofaScore proxy to edge runtime (fixes Vercel TS build)

## [3.0.0] build 2 — 2026-06-27 (build)
- Splash logo blend-edges for cleaner trophy hero on load

## [3.0.0] build 1 — 2026-06-27 (major)
- V3 — unified multi-API match detail (stats, lineups, commentary, H2H)
- Live kickoff countdown, trophy branding refresh, and full deploy hardening
- WC2026, WC Live, Zafronix, SofaScore, ESPN, and World Cup history integrations

## [2.0.0] build 2 — 2026-06-26 (build)

- Complete branding sweep (Simulator, Tournament, Schedule, Match views), rewrite README, sync package-lock and api-portal naming

## [2.0.0] build 1 — 2026-06-26 (major)

- Jump to v2 with controlled versioning: `version.json`, Vite inject, `scripts/version.mjs`
- Added `CHANGELOG.md`, `docs/VERSIONING.md`, and unified `APP_BRAND` in `src/config/appMeta.ts`
- Rewrote README for Road to the World Cup Final 2026 branding and v2 feature set
- Unified UI branding (TopNav, Splash, Simulator, tournament/match context bars)
- Baseline includes: live scores, tournament hub, match detail, venue hub, bracket certainty, results/groups enhancements, API audit layer
