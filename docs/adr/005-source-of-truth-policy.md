# ADR-005: Field-Level Source-of-Truth Policy

## Status
Accepted

## Context
Multiple providers disagree on match status, scores, kickoffs, and rankings.

## Decision
ReconciliationEngine enforces a declared authority chain per field (PRIMARY > BACKUP > FALLBACK). Policy stored in DB table; `CorrectionEvent` with ANALYST_OVERRIDE wins until reverted or superseded by locked result.

## Key policies
- `match.score` (live): WC2026 Live > consensus > ESPN
- `match.score` (final): FIFA > WC2026 Live > ESPN
- `match.status`: ESPN > WC2026 Live > SportAPI7
- `group.teamAssignment`: static catalog (immutable)

## Consequences
- All field arbitration is explicit and logged in `sourceTrace` on canonical entities.
