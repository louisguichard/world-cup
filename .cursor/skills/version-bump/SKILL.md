---
name: version-bump
description: >-
  Bump build number, update VERSION_LOG and CHANGELOG, sync release canvas.
  Use after any code change before commit, or when the user asks to bump version/build.
---

# Version bump skill

## When to use
- After completing any code/config change in this repo
- Before creating a commit (unless pre-commit hook will run)
- When user says "bump build", "update version", or "sync release canvas"

## Commands

```bash
# Default — increment build (use every change set)
npm run version:build -- --message "What changed in plain language"

# Semver release (resets build to 1, updates CHANGELOG release section)
npm run version:patch -- --message "Release notes"
npm run version:minor -- --message "Release notes"
npm run version:major -- --message "Release notes"

# Manual canvas sync
npm run version:sync-canvas

# Record deploy after Vercel
npm run deploy:vercel

# Show current
npm run version:show
```

## Files updated automatically
| File | On build bump |
|------|----------------|
| `version.json` | build++ |
| `package.json` | version synced |
| `VERSION_LOG.md` | detailed entry |
| `CHANGELOG.md` | `[Unreleased]` builds line |
| `build-manifest.json` | structured build record |
| `canvases/release-dashboard.canvas.tsx` | embedded snapshot |

## Rules
1. Always pass `--message` with a meaningful summary for build bumps.
2. Do not hand-edit `version.json` build number.
3. Commit version artifacts in the same commit as the code change.
4. Open [release dashboard canvas](/Users/RonalSorto/.cursor/projects/Users-RonalSorto-Developer-world-cup/canvases/release-dashboard.canvas.tsx) to verify sync.
