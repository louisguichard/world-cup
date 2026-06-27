/**
 * Central API kill-switches. Flip `enabled` to isolate splash/bootstrap issues.
 * Last audited: 2026-06-27 via `npm run test:rapidapi:full` + `npm run test:apis`
 */

export type ApiSourceId =
  | "espnScoreboard"
  | "espnPlayByPlay"
  | "polymarketWinner"
  | "polymarketGames"
  | "fifaRankings"
  | "footballDataApi"
  | "sportApi7"
  | "wc2026Teams"
  | "wc2026Live"
  | "sofascore"
  | "sofascoreRapid"
  | "clubElo"
  | "zafronix"
  | "oddsIntelligence"
  | "footballPrediction"
  | "worldCupHistory"
  | "sportHighlights"
  | "allSportLiveStream"
  | "iptvXtreamDaily"
  | "iptvCloudSubscriber"
  | "iptvTvView"
  | "sportsLiveScores"
  | "openWeather"
  | "flashLive";

export type ApiAuditStatus = "pass" | "fail" | "untested";

export type ApiSourceConfig = {
  /** When false, client code skips this source entirely. */
  enabled: boolean;
  /** True if this source is on the splash / bootstrap critical path. */
  splashPath: boolean;
  label: string;
  lastAudit: ApiAuditStatus;
  lastLatencyMs: number;
  failureReason?: string;
  /** Why we disabled it (shown in debug UI). */
  disableReason?: string;
};

export const API_SOURCES: Record<ApiSourceId, ApiSourceConfig> = {
  espnScoreboard: {
    enabled: true,
    splashPath: true,
    label: "ESPN Scoreboard",
    lastAudit: "pass",
    lastLatencyMs: 412,
  },
  espnPlayByPlay: {
    enabled: true,
    splashPath: false,
    label: "ESPN Play-by-Play",
    lastAudit: "pass",
    lastLatencyMs: 200,
  },
  polymarketWinner: {
    enabled: true,
    splashPath: false,
    label: "Polymarket Winner",
    lastAudit: "pass",
    lastLatencyMs: 146,
  },
  polymarketGames: {
    enabled: true,
    splashPath: false,
    label: "Polymarket Games (8 pages)",
    lastAudit: "pass",
    lastLatencyMs: 118,
  },
  fifaRankings: {
    enabled: false,
    splashPath: false,
    label: "FIFA Rankings API",
    lastAudit: "fail",
    lastLatencyMs: 94,
    failureReason: "Returns HTML instead of JSON (bot protection)",
    disableReason: "Replaced by static June 11 2026 snapshot in src/data/fifaRankings2026PreTournament.json",
  },
  footballDataApi: {
    enabled: true,
    splashPath: false,
    label: "RapidAPI FotMob Live",
    lastAudit: "pass",
    lastLatencyMs: 607,
  },
  sportApi7: {
    enabled: true,
    splashPath: false,
    label: "SofaScore6 RapidAPI (SportAPI7 alias)",
    lastAudit: "pass",
    lastLatencyMs: 260,
  },
  wc2026Teams: {
    enabled: true,
    splashPath: false,
    label: "WC 2026 Teams API",
    lastAudit: "pass",
    lastLatencyMs: 250,
  },
  wc2026Live: {
    enabled: true,
    splashPath: false,
    label: "WC 2026 Live API",
    lastAudit: "pass",
    lastLatencyMs: 238,
  },
  sofascore: {
    enabled: true,
    splashPath: false,
    label: "SofaScore6 RapidAPI",
    lastAudit: "pass",
    lastLatencyMs: 260,
  },
  sofascoreRapid: {
    enabled: true,
    splashPath: false,
    label: "SofaScore RapidAPI",
    lastAudit: "pass",
    lastLatencyMs: 200,
  },
  clubElo: {
    enabled: true,
    splashPath: false,
    label: "ClubElo",
    lastAudit: "pass",
    lastLatencyMs: 738,
  },
  zafronix: {
    enabled: true,
    splashPath: false,
    label: "Zafronix Historical Form",
    lastAudit: "pass",
    lastLatencyMs: 230,
    failureReason: "Protected routes need VITE_ZAFRONIX_API_KEY from api.zafronix.com/signup",
  },
  oddsIntelligence: {
    enabled: true,
    splashPath: false,
    label: "Sports Odds Intelligence",
    lastAudit: "pass",
    lastLatencyMs: 216,
  },
  footballPrediction: {
    enabled: true,
    splashPath: false,
    label: "Football Prediction API (Boggio v2)",
    lastAudit: "pass",
    lastLatencyMs: 200,
  },
  worldCupHistory: {
    enabled: true,
    splashPath: false,
    label: "World Cup History (world-cup1)",
    lastAudit: "untested",
    lastLatencyMs: 662,
    failureReason: "BASIC plan daily quota — cached 24h",
  },
  sportHighlights: {
    enabled: true,
    splashPath: false,
    label: "Sport Highlights API (Highlightly)",
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
  allSportLiveStream: {
    enabled: true,
    splashPath: false,
    label: "All Sport Live Stream",
    lastAudit: "untested",
    lastLatencyMs: 0,
    failureReason: "Schedule endpoint may return GraphQL PersistedQueryNotFound upstream",
  },
  iptvXtreamDaily: {
    enabled: true,
    splashPath: false,
    label: "Free Daily Xtream IPTV Servers",
    lastAudit: "untested",
    lastLatencyMs: 0,
    failureReason: "Requires RapidAPI subscription; cached 6h after fetch",
  },
  iptvCloudSubscriber: {
    enabled: true,
    splashPath: false,
    label: "Cloud API Hub IPTV Auto Subscriber",
    lastAudit: "untested",
    lastLatencyMs: 0,
    failureReason: "Requires RapidAPI subscription; cached 6h per country",
  },
  iptvTvView: {
    enabled: true,
    splashPath: false,
    label: "TVView IPTV Index",
    lastAudit: "untested",
    lastLatencyMs: 0,
    failureReason: "Requires RapidAPI subscription; fallback-only source",
  },
  sportsLiveScores: {
    enabled: true,
    splashPath: false,
    label: "Sports Live Scores",
    lastAudit: "untested",
    lastLatencyMs: 0,
    failureReason: "FIFA league rankings may return empty on BASIC plan; odds/live vary by match",
  },
  openWeather: {
    enabled: true,
    splashPath: false,
    label: "Open Weather 13",
    lastAudit: "pass",
    lastLatencyMs: 331,
  },
  flashLive: {
    enabled: true,
    splashPath: false,
    label: "FlashLive Sports",
    lastAudit: "untested",
    lastLatencyMs: 0,
    failureReason: "Requires RapidAPI subscription; live scores, teams, transfers",
  },
};

/** Bootstrap toggles — flip to isolate splash hang causes. */
export const BOOTSTRAP_FLAGS = {
  /** Background Polymarket/FIFA/ESPN enrichment after splash. */
  backgroundEnrichment: true,
  /** Monte Carlo sim — runs after splash (never blocks mobile fast path). */
  bootstrapSimulation: true,
} as const;

export function isApiEnabled(id: ApiSourceId): boolean {
  return API_SOURCES[id].enabled;
}

export function listDisabledApis(): ApiSourceConfig[] {
  return Object.values(API_SOURCES).filter((s) => !s.enabled);
}

export { API_QUOTA_POLICY } from "./apiQuotaPolicy";
