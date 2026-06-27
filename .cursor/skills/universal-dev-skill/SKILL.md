---
name: universal-dev-skill
description: >-
  Use for any software task in this repo: inspect the stack, find entry points
  and tests, make the smallest safe change, and verify with build or tests.
  Invoke when the user prefixes a request with /universal-dev-skill or asks
  for safe, minimal implementation work (features, fixes, API integration, refactors).
---

# Universal Dev Skill

## Description
Use this skill for any software project to inspect the codebase, identify the stack, find entry points, make the smallest safe change, and verify it with tests or a build.

## Instructions
1. Inspect the repository structure and identify the app type, framework, and key entry files.
2. Find configuration, environment variables, scripts, and tests before changing code.
3. Make the smallest safe change that solves the request.
4. Verify the change with the appropriate test or build command.
5. Explain what changed, what was verified, and any risks or follow-up work.
6. Prefer reusable patterns, clean boundaries, and minimal coupling.
7. Ask clarifying questions when requirements are ambiguous.

## Examples
- Add a new feature safely.
- Debug a failing build.
- Set up an API integration.
- Refactor code without breaking behavior.

## Workflow (apply on every invocation)
1. Read `package.json` scripts and `.env.example` before editing.
2. Match existing patterns in the touched area (naming, imports, error handling).
3. Run the narrowest verification that proves the change (`vitest` for lib changes, `npm run build` for app-wide).
4. Report: what changed, what was verified, risks/follow-ups.
