# Architecture Council Review — WC2026 Qualification Engine

Multi-reviewer synthesis (architect-led single pass covering council prompt criteria).

## 1. Domain Boundary Correctness

**Strong:** BC1/BC2/BC3 separation is explicit in packages, ADRs, and UI (official vs prediction panels). QualificationWorker never reads prediction store.

**Weak:** M0 still bridges `server/src/bc*` and `packages/*`; dual paths until monorepo migration completes.

**Missing:** Explicit anti-corruption layer interfaces between BC1 canonical DTOs and BC2/BC3 inputs.

**Highest-risk failure mode:** Developer imports prediction helpers inside qualification package during feature rush.

## 2. Canonical Identity Strategy

**Strong:** Quarantine-first, per-provider composite keys, audit log.

**Weak:** Fuzzy threshold (0.85) not yet calibrated against real 15-provider alias set.

**Missing:** Automated nightly alias drift report.

**Highest-risk failure mode:** Provider ID reuse across tournaments maps to wrong canonical team.

## 3. Event Sourcing Correctness

**Strong:** Raw log, correction events, immutable snapshots.

**Weak:** Not all event types have Zod schemas in `packages/events` yet.

**Missing:** `MatchResultLockedEvent` explicit schema + idempotency key on bus.

**Highest-risk failure mode:** Duplicate event delivery causes double snapshot insert without inputHash dedup.

## 4. Reliability Under Provider Drift

**Strong:** Zod boundary, circuit breakers, quarantine on schema violation.

**Weak:** Consensus score logic not fully ported from client `LiveScoreConsensus`.

**Missing:** Per-entity staleness badges wired to all UI surfaces.

**Highest-risk failure mode:** Silent schema drift drops all updates for a provider until manual intervention.

## 5. Qualification Engine Isolation

**Strong:** ADR-004, locked-result gate, engineVersion on snapshots.

**Weak:** Client still computes qualification locally as fallback.

**Missing:** Feature flag to disable client-side qual compute when QueryAPI healthy.

**Highest-risk failure mode:** Client and server qual diverge during partial backend outage.

## 6. Prediction Explainability

**Strong:** Factor contribution wrapper preserves Dixon-Coles core.

**Weak:** Shapley-style attribution is simplified; not true Shapley values.

**Missing:** Calibration dashboard vs Polymarket historical RMSE.

**Highest-risk failure mode:** Analysts over-trust factor percentages as causal when they are heuristic.

## 7. Scale & Recompute Design

**Strong:** Partial recompute scoped to group; third-place debounce planned.

**Weak:** Last group-stage day fan-out not load-tested.

**Missing:** BullMQ concurrency caps documented per queue.

**Highest-risk failure mode:** 24 simultaneous match locks overwhelm prediction queue.

## 8. Security & Authority Separation

**Strong:** RBAC model in admin app; append-only corrections.

**Weak:** Clerk stub only; API routes not yet role-gated in all admin endpoints.

**Missing:** `admin_actions` audit table.

**Highest-risk failure mode:** Unauthenticated POST to `/api/corrections` in production.

## 9. Testability

**Strong:** Pure qualification/prediction packages, injectable IdentityService, Vitest throughout.

**Weak:** BullMQ integration tests not yet in CI.

**Missing:** Recorded fixture replay harness for full boot→push path.

**Highest-risk failure mode:** Regression in reconciliation policy undetected until live tournament.

## 10. Migration Risk

**Strong:** Copy-verbatim promotion strategy for qualification.ts.

**Weak:** Dual client/server qual paths during transition.

**Missing:** Shadow mode comparing client vs server snapshots.

**Highest-risk failure mode:** Premature cutover to server qual before snapshot parity verified.

---

## Top 5 Architectural Risks

1. Client/server qualification divergence during M3–M5 migration
2. Identity alias collision at 15-provider scale
3. Provider schema breaking changes during live tournament
4. SSE/Vercel timeout under analyst load (mitigate with Railway push proxy)
5. Unauthenticated admin write endpoints before M6 RBAC hardening

## Top 5 Highest-Value v1 Improvements

1. Shadow-mode qual snapshot comparison (client vs server)
2. Complete Zod event catalog + idempotent consumers
3. Clerk + API middleware on all admin mutations
4. Load test last group-stage recompute fan-out
5. Full MSW fixture suite for all 15 providers

## Recommendation: **GO** (with non-negotiable changes below)

Proceed with M0–M6 sequence. Do not cut over client qualification compute until shadow parity passes.
