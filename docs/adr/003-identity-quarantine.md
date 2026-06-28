# ADR-003: Identity Quarantine-First

## Status
Accepted

## Context
15 providers with inconsistent IDs; fuzzy joins risk wrong canonical mappings.

## Decision
- Exact alias match → resolve immediately.
- Fuzzy match below 0.85 confidence → quarantine queue; no canonical write.
- Analyst manual confirm required for quarantined entries.

## Consequences
- Safer identity graph at cost of analyst review queue depth.
- Alert when quarantine depth > 20.
