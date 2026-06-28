# ADR-001: Monorepo Structure

## Status
Accepted

## Context
The WC2026 engine requires three isolated bounded contexts, shared types, and independently deployable workers.

## Decision
Adopt pnpm workspaces with `apps/`, `packages/`, and `workers/`. Existing React PWA remains at repo root (`src/`) during M0; packages are wired incrementally.

## Consequences
- Clear package boundaries enforce BC separation at compile time.
- M0 migration is incremental — no big-bang move of `src/` to `apps/web`.
