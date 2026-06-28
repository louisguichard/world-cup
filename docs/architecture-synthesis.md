# Architecture Synthesis — WC2026 Qualification Engine

Lead architect synthesis after council review.

## 1. Non-Negotiable Changes Before Production Cutover

1. **Auth on all admin write APIs** — Clerk middleware on POST/PUT `/api/corrections`, `/api/identity/*`, provider policy edits.
2. **inputHash dedup on QualificationWorker** — identical inputs must skip duplicate snapshot rows (already implemented; keep as CI gate).
3. **Shadow qual comparison** — log client vs server tier/certainty mismatches for 7 days before disabling client compute.
4. **Complete event Zod schemas** — every bus event type validated at publish and consume boundaries.
5. **admin_actions audit table** — every admin mutation recorded with analystId + reason.

## 2. Optional Improvements (Not Blocking v1)

- True Shapley factor attribution (replace heuristic decomposition)
- GraphQL analyst API (v2)
- TimescaleDB for raw_event_log partitioning
- WebSocket push instead of SSE
- Automated alias drift nightly report

## 3. Risks Accepted for v1

- Simplified factor attribution (heuristic, not Shapley)
- M0 dual path (`server/src` + `packages/*` bridge)
- Moderate analyst scale on SSE (tens, not thousands)
- Manual quarantine review (no ML auto-resolve)
- Plain PostgreSQL without Timescale hypertables

## 4. Final Recommended Architecture

No change to three-BC model. Add:

- **Shadow comparison service** during M3–M5
- **API auth middleware layer** in `apps/api` before M6 launch
- **Single push deployment** on Railway for SSE long-lived connections; Vercel QueryAPI remains stateless

Identity, event sourcing, and source-of-truth policies remain as designed in ADR-001 through ADR-005.

## 5. Ordered Build Plan (Confirmed)

| Order | Milestone | Adjustment from review |
|-------|-----------|------------------------|
| 1 | M0 Foundation | Add shadow comparison hook stub |
| 2 | M1 Identity | Seed all 48 teams before enabling fuzzy |
| 3 | M2 Intake | MSW fixtures for top 3 providers first |
| 4 | M3 Qualification | Shadow mode required before client cutover |
| 5 | M4 Prediction | Keep attribution as post-hoc wrapper |
| 6 | M5 Query + Push | Railway SSE; Vercel for REST only |
| 7 | M6 Admin + OTel | Clerk + admin_actions table |

## 6. Open Questions — Decisions

| Question | Reviewers disagreed? | Decision |
|----------|-------------------|----------|
| SSE on Vercel vs Railway for push | Yes | **Railway** hosts PushService; Vercel hosts QueryAPI |
| Client qual compute retirement timing | Yes | Retire only after **7-day shadow parity** |
| Fuzzy auto-resolve above 0.95? | Yes | **No** — quarantine all fuzzy until M2+ tuning with analyst data |
| GraphQL for analyst API? | Yes | **Defer to v2** — REST + SSE sufficient for v1 |
| Monorepo tool: pnpm vs npm | Minor | **pnpm workspaces** (declared); root stays npm-compatible until M0 complete |

**Verdict: Proceed to build.** Update `.cursorrules` and ADRs if push topology changes during M5.
