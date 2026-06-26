/**
 * Central API kill-switches. Flip `enabled` to isolate splash/bootstrap issues.
 * Last audited: 2026-06-25 via `node scripts/test-all-apis.mjs`
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
  | "clubElo"
  | "zafronix"
  | "oddsIntelligence"
  | "openWeather";

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
    enabled: false,
    splashPath: false,
    label: "ESPN Play-by-Play",
    lastAudit: "fail",
    lastLatencyMs: 143,
    failureReason: "Vite proxy returns HTTP 403 (direct API works)",
    disableReason: "Proxy blocked — disabled until espn-web proxy is fixed",
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
    disableReason: "FIFA API blocked — ratings use strength-index fallback",
  },
  footballDataApi: {
    enabled: true,
    splashPath: false,
    label: "RapidAPI FotMob Live",
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
  sportApi7: {
    enabled: true,
    splashPath: false,
    label: "SportAPI7 (WC)",
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
  wc2026Teams: {
    enabled: true,
    splashPath: false,
    label: "WC 2026 Teams API",
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
  wc2026Live: {
    enabled: true,
    splashPath: false,
    label: "WC 2026 Live API",
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
  sofascore: {
    enabled: false,
    splashPath: false,
    label: "SofaScore Live",
    lastAudit: "fail",
    lastLatencyMs: 800,
    failureReason: "Akamai TLS fingerprinting returns 403 challenge (headers alone insufficient)",
    disableReason: "Demoted to tertiary fallback — RapidAPI FootballData + SportAPI7 primary",
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
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
  oddsIntelligence: {
    enabled: true,
    splashPath: false,
    label: "Sports Odds Intelligence",
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
  openWeather: {
    enabled: true,
    splashPath: false,
    label: "Open Weather 13",
    lastAudit: "untested",
    lastLatencyMs: 0,
  },
};

/** Bootstrap toggles — flip to isolate splash hang causes. */
export const BOOTSTRAP_FLAGS = {
  /** Background Polymarket/FIFA/ESPN enrichment after splash. */
  backgroundEnrichment: true,
  /** Monte Carlo sim gate on splash (not an API — main suspect for long splash). */
  bootstrapSimulation: true,
} as const;

export function isApiEnabled(id: ApiSourceId): boolean {
  return API_SOURCES[id].enabled;
}

export function listDisabledApis(): ApiSourceConfig[] {
  return Object.values(API_SOURCES).filter((s) => !s.enabled);
}
