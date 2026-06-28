# WC2026 — Phase 3: Implementation Plan

## Monorepo Layout

```
world-cup/
├── apps/
│   ├── web/          ← existing React PWA (src/ at root during M0 migration)
│   ├── api/          ← Hono QueryAPI (server/src during M0)
│   └── admin/        ← Admin console React app
├── packages/
│   ├── canonical/    ← shared domain types
│   ├── events/       ← event types + Zod schemas
│   ├── qualification/← BC2 pure functions
│   ├── prediction/   ← BC3 prediction engine
│   ├── identity/     ← identity resolution
│   ├── zod-schemas/  ← provider Zod schemas
│   └── db/           ← Prisma schema
├── workers/          ← BullMQ workers (server/src/bc* during M0)
├── api/              ← Vercel edge proxies (unchanged)
├── docs/adr/         ← Architecture Decision Records
└── .cursorrules
```

**Toolchain:** pnpm workspaces (incremental). Workers deploy to Railway/Fly.io. API + web + admin on Vercel.

## Milestones

| Milestone | Days | Deliverables |
|-----------|------|--------------|
| **M0 Foundation** | 1–5 | Monorepo packages, canonical types, events, Prisma, ADRs, CI |
| **M1 Identity** | 6–12 | IdentityService, seed 48 teams, quarantine queue, admin stub |
| **M2 Intake** | 13–22 | IntakeWorkers, ReconciliationEngine, correction pipeline, provider health |
| **M3 Qualification** | 23–30 | Promote qualification.ts, QualificationWorker, snapshots, QueryAPI |
| **M4 Prediction** | 31–40 | PredictionWorker, ScenarioService, factor attribution, scenario UI |
| **M5 Query + Push** | 41–48 | SSE endpoint, cache layer, client SSE integration |
| **M6 Admin + OTel** | 49–58 | Admin app, RBAC, observability, full CI gate |

## Testing Matrix

| Layer | Tool | Gate |
|-------|------|------|
| Qualification pure functions | Vitest | CI block |
| Prediction pure functions | Vitest | CI block |
| Identity resolution | Vitest | CI block |
| Reconciliation field policy | Vitest | CI block |
| Zod provider schemas | Vitest + fixtures | CI block |
| BullMQ worker flows | Vitest + Redis | CI block |
| QueryAPI endpoints | Supertest | CI block |
| SSE push flow | Vitest | CI block |
| UI smoke | Playwright | CI warn |

## Deployment

- **Vercel:** apps/web, apps/api, apps/admin, api/* proxies
- **Railway/Fly.io:** workers (intake, reconciliation, qualification, prediction)
- **Upstash:** Redis (event bus, cache, scenario scratch)
- **Neon:** PostgreSQL (canonical, snapshots, event logs)

## Migration from Current Code

1. Copy `src/lib/qualification.ts` (+ bestThirds, thirdPlaceRanking, thirdPlaceMap) → `packages/qualification`
2. Update imports to `packages/canonical`
3. Run existing tests unchanged against new package
4. Client reads qualification from QueryAPI instead of local compute
5. Qualification logic itself does not change — only execution context

See [docs/cursor-prompts/](./cursor-prompts/) for executable subsystem prompts.
