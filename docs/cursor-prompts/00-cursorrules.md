# PROMPT 0 — `.cursorrules` file

See project root `.cursorrules` and `.cursor/rules/*.mdc` for the generated output.

```
Create a `.cursorrules` file for this project. This is a TypeScript monorepo for a cloud-native FIFA World Cup qualification prediction engine.

Project constraints:
- TypeScript strict mode everywhere; no implicit any
- Domain-driven design; bounded context boundaries are hard separations in the monorepo
- Official qualification logic is in packages/qualification — pure function package, no I/O, no predictions
- Prediction logic is in packages/prediction — reads qualification output but never writes to qualification state
- All canonical entity types live in packages/canonical — import from there, never redefine locally
- All events live in packages/events with Zod schemas — always validate at boundaries
- No provider-native IDs outside adapter/reconciliation layers
- No fuzzy identity joins in the core path — fuzzy results go to quarantine queue only
- All important architectural changes require an ADR in docs/adr/
- Prefer pure functions for domain math
- Prefer append-only patterns for audit trails and event logs
- Never destructively overwrite raw provider data
- Source-of-truth policy table governs field ownership
- All admin corrections are CorrectionEvents in append-only correction_events table
- Add regression tests for identity, qualification, or reconciliation bugs
- No inline imports; all imports at top of file
```
