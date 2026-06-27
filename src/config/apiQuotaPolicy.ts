import type { ApiSourceId } from "./apiFlags";

export type ApiRequestIntent = "live" | "background" | "test";

export type ApiQuotaPolicy = {
  /**
   * Hard daily cap from provider plan when known.
   * Null means unknown/not published.
   */
  dailyLimit: number | null;
  /**
   * Internal soft ceiling used for conservative usage when dailyLimit is unknown.
   */
  softDailyLimit?: number;
  /**
   * Keep this many requests untouched for live windows.
   */
  reserveForLive?: number;
  /**
   * Minimum spacing between calls by intent.
   */
  minIntervalMs: Record<ApiRequestIntent, number>;
  /**
   * Human-readable notes for future tuning.
   */
  note: string;
};

/**
 * Conservative per-source usage policy.
 * Update values from RapidAPI dashboards whenever plans change.
 */
export const API_QUOTA_POLICY: Record<ApiSourceId, ApiQuotaPolicy> = {
  espnScoreboard: {
    dailyLimit: null,
    softDailyLimit: 3_000,
    reserveForLive: 500,
    minIntervalMs: { live: 15_000, background: 300_000, test: 60_000 },
    note: "Public ESPN endpoint; no official cap exposed, keep conservative spacing.",
  },
  espnPlayByPlay: {
    dailyLimit: null,
    softDailyLimit: 2_000,
    reserveForLive: 300,
    minIntervalMs: { live: 20_000, background: 300_000, test: 60_000 },
    note: "Public ESPN endpoint used for event enrichment only.",
  },
  polymarketWinner: {
    dailyLimit: null,
    softDailyLimit: 500,
    minIntervalMs: { live: 300_000, background: 1_800_000, test: 300_000 },
    note: "Market data does not need tight polling.",
  },
  polymarketGames: {
    dailyLimit: null,
    softDailyLimit: 500,
    minIntervalMs: { live: 300_000, background: 1_800_000, test: 300_000 },
    note: "Paged market scan; cache heavily.",
  },
  fifaRankings: {
    dailyLimit: null,
    softDailyLimit: 0,
    minIntervalMs: { live: 86_400_000, background: 86_400_000, test: 86_400_000 },
    note: "Disabled in app; static snapshot replaces API.",
  },
  footballDataApi: {
    dailyLimit: 100,
    reserveForLive: 20,
    minIntervalMs: { live: 60_000, background: 900_000, test: 300_000 },
    note: "RapidAPI plan-limited; keep as secondary enrichment source.",
  },
  sportApi7: {
    dailyLimit: 100,
    reserveForLive: 40,
    minIntervalMs: { live: 20_000, background: 900_000, test: 300_000 },
    note: "Critical live corroboration source; preserve headroom for active matches.",
  },
  wc2026Teams: {
    dailyLimit: 50,
    reserveForLive: 5,
    minIntervalMs: { live: 300_000, background: 3_600_000, test: 900_000 },
    note: "Mostly static metadata; do not poll aggressively.",
  },
  wc2026Live: {
    dailyLimit: 100,
    reserveForLive: 40,
    minIntervalMs: { live: 20_000, background: 600_000, test: 300_000 },
    note: "Primary corroboration source for live scores and standings.",
  },
  sofascore: {
    dailyLimit: 100,
    reserveForLive: 20,
    minIntervalMs: { live: 30_000, background: 900_000, test: 300_000 },
    note: "Alias family uses same upstream as sportApi7.",
  },
  sofascoreRapid: {
    dailyLimit: 100,
    reserveForLive: 20,
    minIntervalMs: { live: 30_000, background: 900_000, test: 300_000 },
    note: "Shared provider family; avoid duplicate calls with sportApi7.",
  },
  clubElo: {
    dailyLimit: null,
    softDailyLimit: 200,
    minIntervalMs: { live: 300_000, background: 3_600_000, test: 300_000 },
    note: "Not real-time critical; cache per team.",
  },
  zafronix: {
    dailyLimit: 50,
    reserveForLive: 10,
    minIntervalMs: { live: 120_000, background: 900_000, test: 300_000 },
    note: "Use as tertiary verification / historical enrichment.",
  },
  oddsIntelligence: {
    dailyLimit: 100,
    reserveForLive: 20,
    minIntervalMs: { live: 30_000, background: 900_000, test: 300_000 },
    note: "Odds updates can lag without harming UX.",
  },
  footballPrediction: {
    dailyLimit: 100,
    reserveForLive: 10,
    minIntervalMs: { live: 900_000, background: 10_800_000, test: 900_000 },
    note: "Daily predictions source; fetch once and cache.",
  },
  worldCupHistory: {
    dailyLimit: 5,
    reserveForLive: 0,
    minIntervalMs: { live: 43_200_000, background: 86_400_000, test: 21_600_000 },
    note: "BASIC plan can be as low as 5/day; 24h cache minimum.",
  },
  sportHighlights: {
    dailyLimit: 5,
    reserveForLive: 0,
    minIntervalMs: { live: 900_000, background: 21_600_000, test: 21_600_000 },
    note: "Treat as low-cap media enrichment source.",
  },
  allSportLiveStream: {
    dailyLimit: 5,
    reserveForLive: 0,
    minIntervalMs: { live: 900_000, background: 21_600_000, test: 21_600_000 },
    note: "Potentially low plan cap; fetch only on explicit watch views.",
  },
  iptvXtreamDaily: {
    dailyLimit: 5,
    reserveForLive: 0,
    minIntervalMs: { live: 3_600_000, background: 21_600_000, test: 21_600_000 },
    note: "Daily rotating Xtream credentials; 6h client cache, fetch on watch tab only.",
  },
  iptvCloudSubscriber: {
    dailyLimit: 5,
    reserveForLive: 0,
    minIntervalMs: { live: 3_600_000, background: 21_600_000, test: 21_600_000 },
    note: "Per-country IPTV subscription; 6h client cache.",
  },
  sportsLiveScores: {
    dailyLimit: 5,
    reserveForLive: 1,
    minIntervalMs: { live: 300_000, background: 21_600_000, test: 21_600_000 },
    note: "Some BASIC plans expose very low quota.",
  },
  openWeather: {
    dailyLimit: 500,
    reserveForLive: 20,
    minIntervalMs: { live: 600_000, background: 3_600_000, test: 600_000 },
    note: "Weather updates are slow-changing; no frequent polling required.",
  },
};
