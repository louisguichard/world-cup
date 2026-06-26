# Road to the World Cup Final 2026

Live scores, qualification tracking, venue hubs, and Monte Carlo tournament intelligence for the 48-team **FIFA World Cup 2026™**.

**Current release:** see [`npm run version:show`](./docs/VERSIONING.md) or [`VERSION_LOG.md`](./VERSION_LOG.md) — [`CHANGELOG.md`](./CHANGELOG.md) covers semver releases.

## What this is

**Road to the Final** is a progressive web app for following the 2026 World Cup end to end: live match center, full schedule, group standings, knockout bracket (with third-place mapping), results archive, host-city venue pages, and a Monte Carlo simulator with editable scenarios.

The product name in UI copy is **Road to the World Cup Final 2026** (short: **Road to the Final**). Tournament context uses **FIFA World Cup 2026™**. All branding strings live in [`src/config/appMeta.ts`](./src/config/appMeta.ts) — do not hardcode product names in components.

## Features

### Live & schedule

- Live scoreboard with polling, match cards, and deep links (`#match/{id}`)
- SofaScore-style match detail: summary, stats, lineups, commentary, head-to-head
- Smart schedule grouping by date, stage, and host city
- TV broadcast lookup (where configured)

### Tournament hub

- Matches, standings, bracket, and stats sub-tabs
- Bracket slot certainty: confirmed, projected, and ghost paths
- Results tab with finished-match archive
- Groups table toggle and team match history

### Venues

- Host-city venue hub with enrichment data (`#venue/{slug}`)
- Venue popovers on match cards and bracket rows
- Per-venue match timeline and metadata

### Simulator

- Editable deterministic scenario (group scores + bracket picks)
- Monte Carlo title odds and conditional opponent paths
- Polymarket match markets and FIFA ranking baseline
- Official 2026 Round-of-32 bracket with 495-combination third-place mapping

### Developer tooling

- Unified API layer with feature flags and dev proxies
- API audit canvas and `tools/api-portal` key vault sync

## Versioning (v2+)

Every meaningful change set must bump the **build** number and append a line to [`VERSION_LOG.md`](./VERSION_LOG.md):

```bash
npm run version:build -- --message "Describe what changed"
```

Semver releases (patch / minor / major) also update [`CHANGELOG.md`](./CHANGELOG.md):

```bash
npm run version:patch -- --message "Bug fix summary"
npm run version:minor -- --message "New feature summary"
npm run version:major -- --message "Breaking change summary"
```

Check the current version:

```bash
npm run version:show
```

Full workflow: [`docs/VERSIONING.md`](./docs/VERSIONING.md).

| File | Role |
|------|------|
| [`version.json`](./version.json) | Canonical semver + build (committed) |
| [`scripts/version.mjs`](./scripts/version.mjs) | Bump script |
| [`VERSION_LOG.md`](./VERSION_LOG.md) | Detailed log of every build |
| [`CHANGELOG.md`](./CHANGELOG.md) | User-facing release notes |

Version and build are injected at build time via Vite (`__APP_VERSION__`, `__APP_BUILD__`) and shown in the top bar and debug panel.

## Local development

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

```bash
npm run build    # production build
npm run preview  # preview production build
npm test         # vitest
```

### Environment

Copy `.env.example` to `.env.local` if you need RapidAPI, Zafronix, or other keys. Use the API portal for key management:

```bash
npm run dev:portal
npm run sync-keys:wc
```

## Deployment

Vercel is the recommended target. The app relies on same-origin rewrites for external APIs (`vercel.json` proxies ESPN, Polymarket, FIFA, RapidAPI hosts, etc.). GitHub Pages alone is not ideal without a separate proxy.

## Data sources

- ESPN public soccer scoreboard (fixtures, scores, cards)
- Polymarket Gamma API (match and outright markets)
- FIFA public rankings (`DecimalTotalPoints`)
- Static match dataset (`src/data/matchSchedule.json`) and venue enrichment JSON
- Optional RapidAPI clients (WC 2026 Teams, WC 2026 Live) behind feature flags

## Simulator model (summary)

Team strength starts from FIFA `DecimalTotalPoints` plus a host bonus for USA, Mexico, and Canada. Polymarket match markets partially adjust ratings; completed matches apply a capped Elo-like update. Monte Carlo title odds are calibrated against Polymarket outright-winner markets. The in-app methodology page has the full derivation.

## Notes

This is a hobby analytics project, not betting advice. The model is intentionally transparent — markets inform inputs and calibration, not black-box outputs.
