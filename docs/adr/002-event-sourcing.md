# ADR-002: Event Sourcing for Corrections and Raw Ingest

## Status
Accepted

## Context
Analyst corrections and provider payloads must be auditable and replayable.

## Decision
- `raw_event_log`: append-only, never updated.
- `correction_events`: append-only; replay onto canonical state.
- Qualification/prediction snapshots: insert-only immutable rows.

## Consequences
- Full audit trail and point-in-time replay supported.
- Storage grows monotonically; retention policies deferred to v2.
