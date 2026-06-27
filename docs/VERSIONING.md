# Versioning

**Road to the World Cup Final 2026** uses a two-part release identifier:

| Part | Source | Example |
|------|--------|---------|
| **Version** (semver) | `version.json` → `version` | `3.0.0` |
| **Build** (monotonic) | `version.json` → `build` | `42` |

Displayed in the app as: `v3.0.0 · build 42` (compact: `v3.0.0+42`).

## Files

| File | Purpose |
|------|---------|
| [`version.json`](../version.json) | Canonical version + build (committed) |
| [`package.json`](../package.json) | `version` field synced from `version.json` on bump |
| [`build-manifest.json`](../build-manifest.json) | Structured builds, commits, deploys for canvas + tooling |
| [`VERSION_LOG.md`](../VERSION_LOG.md) | Detailed log of **every** build and release |
| [`CHANGELOG.md`](../CHANGELOG.md) | User-facing notes — `[Unreleased]` builds + semver releases |
| [`src/config/appMeta.ts`](../src/config/appMeta.ts) | Branding + runtime version constants |
| Release canvas | `~/.cursor/projects/.../canvases/release-dashboard.canvas.tsx` (auto-synced) |

## Automatic enforcement

Git hooks (installed via `npm run prepare` → `.githooks/`):

| Hook | Action |
|------|--------|
| **pre-commit** | If substantive files are staged → `build++`, update logs + canvas, stage version artifacts |
| **post-commit** | Record commit hash in `build-manifest.json`, sync canvas |

Cursor rule: `.cursor/rules/version-bump-required.mdc` (always apply for agents).

## Workflow

### After every change set (default)

```bash
npm run version:build -- --message "Add venue hub timeline expand controls"
```

Or commit with substantive changes — pre-commit hook bumps automatically.

### Patch / minor / major release

```bash
npm run version:patch -- --message "Fix bracket ghost rendering on mobile"
```

Moves `[Unreleased]` build lines into the new release section in `CHANGELOG.md`.

### Deploy

```bash
npm run deploy:vercel
```

Builds, deploys, records deploy in manifest, syncs release canvas.

### Manual canvas sync

```bash
npm run version:sync-canvas
```

### Check current

```bash
npm run version:show
```

## Rules

1. **Never** hand-edit `version.json` build number unless recovering from a mistake.
2. **Always** include a meaningful `--message` when bumping manually.
3. Commit version artifacts (`version.json`, `VERSION_LOG.md`, `CHANGELOG.md`, `build-manifest.json`) with the code change.
4. Open the [release dashboard canvas](file:///Users/RonalSorto/.cursor/projects/Users-RonalSorto-Developer-world-cup/canvases/release-dashboard.canvas.tsx) to verify sync.

## Build-time injection

Vite reads `version.json` and defines `__APP_VERSION__`, `__APP_BUILD__`, `__APP_CHANNEL__`.

Import from `src/config/appMeta.ts` in application code.
