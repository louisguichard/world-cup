# API usage limits and quota strategy

This project uses a quota governor to keep API usage predictable and safe on low-cap plans.

## Source of truth

- Runtime policy map: `src/config/apiQuotaPolicy.ts`
- Runtime governor: `src/services/ApiQuotaGovernor.ts`

## Conservative assumptions

When an upstream provider does not publish a strict cap, we use a **soft daily limit** and minimum poll intervals.

When a provider is known to have very low plans, we lock in hard caps (for example `5/day`) and reserve live headroom where needed.

## Verification rule

- Match score updates require multi-source verification in `DataOrchestrator.live`:
  - 3-of-3 agreement updates immediately
  - 2-source agreement requires two consecutive confirmations
- Standings remote merges in `resolveGroupStandings` require at least two agreeing sources per row.

## Testing quota controls

- `scripts/test-rapidapi-full.mjs` now defaults to conservative mode with call cap.
- Use `--aggressive` only when intentionally running high-usage probes.
- `scripts/test-all-apis.mjs` now skips heavy/duplicate probes in conservative mode.

## Operational guidance

1. Prefer cached data outside live windows.
2. Keep live polling only for score-critical providers.
3. Periodically adjust policy values from provider dashboards.
