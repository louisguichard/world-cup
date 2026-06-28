# ADR-004: Qualification Engine Isolation

## Status
Accepted

## Context
Official advancement status must never be contaminated by probabilistic models.

## Decision
- BC2 consumes only `MatchResultLockedEvent` (locked official results).
- QualificationWorker never reads prediction store or scenario scratch.
- `engineVersion` pinned on every snapshot; comparisons only within same version.

## Match locking criteria
Score final + authoritative source confirms + 5min cooldown from last score change.

## Consequences
- Live scores update UI standings but not official qualification certainty until locked.
