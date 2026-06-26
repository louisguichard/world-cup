# Versioning

**Road to the World Cup Final 2026** uses a two-part release identifier:

| Part | Source | Example |
|------|--------|---------|
| **Version** (semver) | `version.json` → `version` | `2.0.0` |
| **Build** (monotonic) | `version.json` → `build` | `42` |

Displayed in the app as: `v2.0.0 · build 42` (compact: `v2.0.0+42`).

## Files

| File | Purpose |
|------|---------|
| [`version.json`](../version.json) | Canonical version + build (committed) |
| [`package.json`](../package.json) | `version` field synced from `version.json` on bump |
| [`VERSION_LOG.md`](../VERSION_LOG.md) | Detailed log of **every** build and release |
| [`CHANGELOG.md`](../CHANGELOG.md) | User-facing release notes (semver bumps only) |
| [`src/config/appMeta.ts`](../src/config/appMeta.ts) | Branding + runtime version constants |

## Workflow

### After every change set (default)

Increment **build** and log what changed:

```bash
npm run version:build -- --message "Add venue hub timeline expand controls"
```

### Patch / minor / major release

Bump semver (resets build to `1`) and update `CHANGELOG.md`:

```bash
npm run version:patch -- --message "Fix bracket ghost rendering on mobile"
npm run version:minor -- --message "Tournament stats API integration"
npm run version:major -- --message "Breaking routing change"
```

### Note without bumping

```bash
npm run version:log -- --message "Spike: map tile provider comparison (no ship)"
```

### Check current

```bash
npm run version:show
```

## Rules

1. **Never** edit `version.json` build number by hand unless recovering from a mistake.
2. **Always** pass `--message` with enough detail to understand the diff in `VERSION_LOG.md`.
3. Run `version:build` before committing a finished slice of work.
4. Use `version:patch|minor|major` only when cutting a named release.
5. Branding strings live in `APP_BRAND` — do not hardcode product names in components.

## Build-time injection

Vite reads `version.json` and defines:

- `__APP_VERSION__`
- `__APP_BUILD__`
- `__APP_CHANNEL__`
- `import.meta.env.VITE_BUILD_VERSION` → `"2.0.0+1"`

Import from `src/config/appMeta.ts` in application code.
