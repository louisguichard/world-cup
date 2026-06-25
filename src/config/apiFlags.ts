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
  | "sofascore"
  | "clubElo";

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
    lastLatencyMs: 412
  },
  espnPlayByPlay: {
    enabled: false,
    splashPath: false,
    label: "ESPN Play-by-Play",
    lastAudit: "fail",
    lastLatencyMs: 143,
    failureReason: "Vite proxy returns HTTP 403 (direct API works)",
    disableReason: "Proxy blocked — disabled until espn-web proxy is fixed"
  },
  polymarketWinner: {
    enabled: true,
    splashPath: false,
    label: "Polymarket Winner",
    lastAudit: "pass",
    lastLatencyMs: 146
  },
  polymarketGames: {
    enabled: true,
    splashPath: false,
    label: "Polymarket Games (8 pages)",
    lastAudit: "pass",
    lastLatencyMs: 118
  },
  fifaRankings: {
    enabled: false,
    splashPath: false,
    label: "FIFA Rankings API",
    lastAudit: "fail",
    lastLatencyMs: 94,
    failureReason: "Returns HTML instead of JSON (bot protection)",
    disableReason: "FIFA API blocked — ratings use strength-index fallback"
  },
  sofascore: {
    enabled: false,
    splashPath: false,
    label: "SofaScore Live",
    lastAudit: "fail",
    lastLatencyMs: 213,
    failureReason: "HTTP 403 forbidden (direct and proxy)",
    disableReason: "SofaScore blocks requests — ESPN-only polling"
  },
  clubElo: {
    enabled: true,
    splashPath: false,
    label: "ClubElo",
    lastAudit: "pass",
    lastLatencyMs: 738
  }
};

/** Bootstrap toggles — flip to isolate splash hang causes. */
export const BOOTSTRAP_FLAGS = {
  /** Background Polymarket/FIFA/ESPN enrichment after splash. */
  backgroundEnrichment: true,
  /** Monte Carlo sim gate on splash (not an API — main suspect for long splash). */
  bootstrapSimulation: true
} as const;

export function isApiEnabled(id: ApiSourceId): boolean {
  return API_SOURCES[id].enabled;
}

export function listDisabledApis(): ApiSourceConfig[] {
  return Object.values(API_SOURCES).filter((s) => !s.enabled);
}
