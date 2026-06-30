# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single primary product: a Vite + React 18 + TypeScript PWA, **Road to the World Cup Final 2026** (entry `index.html` → `src/main.tsx`). Node 22 is used (matches CI). Standard commands live in `README.md` and `package.json` `scripts`; prefer those.

### Services

- **Web app (primary)** — `npm run dev` serves on `http://127.0.0.1:5173/` (host is pinned to `127.0.0.1`, not `localhost`/`0.0.0.0`, in `vite.config.ts`). This is the only service needed to develop/test the product end to end.
- **FIFA public API HTTP (optional)** — clone [fifa-public-api-mcp](https://github.com/chrispickford/fifa-public-api-mcp) as a sibling repo (`../fifa-public-api-mcp`), run `npm run serve` there (port 4000), or `npm run fifa:serve` from this repo after building the sibling. The PWA proxies `/api/fifa-public` → `127.0.0.1:4000` in dev. No API key required. If the service is down, boot/live continue on ESPN + static schedule (`apiFlags.fifaPublicApi` kill-switch).
- **`tools/api-portal` (optional)** — a separate Express + Vite key-vault tool (`npm run dev:portal`). It depends on the native `keytar` module (macOS Keychain / Linux libsecret) and is only for syncing API keys to Vercel. Not required for app development; skip unless explicitly working on key management.

### Non-obvious caveats

- **No secrets required to run or test.** Without `VITE_RAPIDAPI_KEY` / `VITE_ZAFRONIX_API_KEY` (see `.env.example`), the app falls back to public ESPN + bundled static data (`src/data/*`). The red `401` banners for SportAPI / WC2026 Teams / Open Weather in dev are expected without keys and do not block core features (live view, bracket, standings, simulator). Add keys to `.env.local` only when testing those specific paid RapidAPI integrations.
- **`npm install` rewrites git hooks.** The `prepare` script runs `scripts/install-git-hooks.mjs`, which sets `core.hooksPath` to `.githooks`. The `pre-commit` hook auto-increments the build number (`scripts/version-auto-bump.mjs`) and the `post-commit` hook records the commit — so committing source changes auto-modifies `version.json`, `VERSION_LOG.md`, `CHANGELOG.md`, and `build-manifest.json`. This is intended repo behavior (see `docs/VERSIONING.md`); expect those files in your commits.
- **`npm run build` runs `tsc -b` first**, so it doubles as the typecheck/lint gate. There is no separate eslint script. CI (`.github/workflows/ci.yml`) runs `npm ci` → `npm test` → `npm run build`.
- **Tests** are Vitest, node environment, only `src/**/*.test.ts` (`npm test`). The many `scripts/test-*.mjs` files are live RapidAPI smoke checks that need real keys — not part of the unit suite.
