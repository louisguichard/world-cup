/**
 * Opt-in feature flags (default OFF). Toggle via VITE_* env without redeploying logic.
 */
export const FEATURE_FLAGS = {
  sls_odds_enabled: import.meta.env.VITE_SLS_ODDS_ENABLED === "true",
  sls_lineups_enabled: import.meta.env.VITE_SLS_LINEUPS_ENABLED === "true",
} as const;
