import type { ApiSourceId } from "../config/apiFlags";
import { API_QUOTA_POLICY, type ApiRequestIntent } from "../config/apiQuotaPolicy";
import { logger } from "./Logger";

const STORAGE_KEY = "wc-api-quota-governor-v2";
const LIVE_CRITICAL_SOURCES: ApiSourceId[] = ["espnScoreboard", "wc2026Live", "sportApi7"];

type UsageRow = {
  count: number;
  lastRequestAt: number;
};

type QuotaState = {
  date: string;
  usage: Partial<Record<ApiSourceId, UsageRow>>;
};

type QuotaDecision =
  | {
      allowed: true;
      remaining: number | null;
      policyLimit: number | null;
    }
  | {
      allowed: false;
      reason: "quota_exhausted" | "live_reserve" | "min_interval";
      retryAfterMs?: number;
      remaining: number | null;
      policyLimit: number | null;
    };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseState(raw: string | null): QuotaState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuotaState;
    if (!parsed || typeof parsed !== "object" || typeof parsed.date !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readStorage(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(STORAGE_KEY);
  }
  const g = globalThis as { __wcQuotaStateRaw?: string };
  return g.__wcQuotaStateRaw ?? null;
}

function writeStorage(value: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  const g = globalThis as { __wcQuotaStateRaw?: string };
  g.__wcQuotaStateRaw = value;
}

function loadState(): QuotaState {
  const parsed = parseState(readStorage());
  const today = todayKey();
  if (!parsed || parsed.date !== today) {
    const fresh: QuotaState = { date: today, usage: {} };
    writeStorage(JSON.stringify(fresh));
    return fresh;
  }
  return parsed;
}

function saveState(state: QuotaState): void {
  writeStorage(JSON.stringify(state));
}

function policyLimitFor(source: ApiSourceId): number | null {
  const policy = API_QUOTA_POLICY[source];
  if (typeof policy.dailyLimit === "number") return policy.dailyLimit;
  if (typeof policy.softDailyLimit === "number") return policy.softDailyLimit;
  return null;
}

function usageRow(state: QuotaState, source: ApiSourceId): UsageRow {
  const existing = state.usage[source];
  if (existing) return existing;
  const created: UsageRow = { count: 0, lastRequestAt: 0 };
  state.usage[source] = created;
  return created;
}

/**
 * Quota gate for all external requests. If allowed, request budget is consumed immediately.
 */
export function acquireApiQuota(source: ApiSourceId, intent: ApiRequestIntent): QuotaDecision {
  const state = loadState();
  const row = usageRow(state, source);
  const policy = API_QUOTA_POLICY[source];
  const limit = policyLimitFor(source);
  const remaining = limit == null ? null : Math.max(0, limit - row.count);

  if (limit != null) {
    const boundedRemaining = Math.max(0, limit - row.count);
    if (boundedRemaining <= 0) {
      return { allowed: false, reason: "quota_exhausted", remaining, policyLimit: limit };
    }
    if (
      intent !== "live" &&
      intent !== "boot" &&
      typeof policy.reserveForLive === "number" &&
      boundedRemaining <= policy.reserveForLive
    ) {
      return { allowed: false, reason: "live_reserve", remaining, policyLimit: limit };
    }
  }

  const minInterval = policy.minIntervalMs[intent];
  const elapsed = Date.now() - row.lastRequestAt;
  if (row.lastRequestAt > 0 && elapsed < minInterval) {
    return {
      allowed: false,
      reason: "min_interval",
      retryAfterMs: minInterval - elapsed,
      remaining,
      policyLimit: limit,
    };
  }

  row.count += 1;
  row.lastRequestAt = Date.now();
  saveState(state);
  const remainingAfter = limit == null ? null : Math.max(0, limit - row.count);
  return { allowed: true, remaining: remainingAfter, policyLimit: limit };
}

export function logApiQuotaBlock(
  source: ApiSourceId,
  intent: ApiRequestIntent,
  decision: Exclude<QuotaDecision, { allowed: true }>
): void {
  logger.info("API quota gate blocked request", "ApiQuotaGovernor", {
    source,
    intent,
    reason: decision.reason,
    retryAfterMs: decision.retryAfterMs ?? 0,
    remaining: decision.remaining,
    limit: decision.policyLimit,
  });
}

/**
 * Dynamically slows polling as live-source budget gets tight.
 */
export function recommendedPollIntervalMs(hasLiveMatches: boolean): number {
  const state = loadState();
  const ratios = LIVE_CRITICAL_SOURCES.map((source) => {
    const limit = policyLimitFor(source);
    if (limit == null || limit <= 0) return 1;
    const used = state.usage[source]?.count ?? 0;
    return Math.max(0, (limit - used) / limit);
  });

  const minRatio = ratios.length > 0 ? Math.min(...ratios) : 1;
  if (hasLiveMatches) {
    if (minRatio <= 0.05) return 60_000;
    if (minRatio <= 0.10) return 45_000;
    if (minRatio <= 0.20) return 30_000;
    return 15_000;
  }

  if (minRatio <= 0.05) return 900_000;
  if (minRatio <= 0.10) return 600_000;
  return 300_000;
}

export function getApiQuotaSnapshot(): {
  date: string;
  usage: Array<{
    source: ApiSourceId;
    used: number;
    remaining: number | null;
    dailyLimit: number | null;
    note: string;
  }>;
} {
  const state = loadState();
  return {
    date: state.date,
    usage: (Object.keys(API_QUOTA_POLICY) as ApiSourceId[]).map((source) => {
      const dailyLimit = policyLimitFor(source);
      const used = state.usage[source]?.count ?? 0;
      const remaining = dailyLimit == null ? null : Math.max(0, dailyLimit - used);
      return {
        source,
        used,
        remaining,
        dailyLimit,
        note: API_QUOTA_POLICY[source].note,
      };
    }),
  };
}
