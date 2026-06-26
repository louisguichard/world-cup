# Version Log

Detailed chronological record of every version and build increment.

Use `npm run version:build -- --message "what changed"` after each meaningful change set.  
Use `npm run version:patch|minor|major` for semver releases.

## [2.0.0] build 2 — 2026-06-26 (build)

- Complete branding sweep (Simulator, Tournament, Schedule, Match views), rewrite README, sync package-lock and api-portal naming

## [2.0.0] build 1 — 2026-06-26 (major)

- Jump to v2 with controlled versioning: `version.json`, Vite inject, `scripts/version.mjs`
- Added `CHANGELOG.md`, `docs/VERSIONING.md`, and unified `APP_BRAND` in `src/config/appMeta.ts`
- Rewrote README for Road to the World Cup Final 2026 branding and v2 feature set
- Unified UI branding (TopNav, Splash, Simulator, tournament/match context bars)
- Baseline includes: live scores, tournament hub, match detail, venue hub, bracket certainty, results/groups enhancements, API audit layer
