import { HIGHLIGHTLY_MONTHLY_REQUEST_LIMIT } from "../config/sportHighlightsEndpoints";

const STORAGE_KEY = "wc-highlightly-quota-v1";

type QuotaStore = {
  month: string;
  used: number;
};

function currentMonthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function readStore(): QuotaStore {
  if (typeof localStorage === "undefined") {
    return { month: currentMonthKey(), used: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: currentMonthKey(), used: 0 };
    const parsed = JSON.parse(raw) as QuotaStore;
    const month = currentMonthKey();
    if (parsed.month !== month) return { month, used: 0 };
    return { month, used: Math.max(0, parsed.used ?? 0) };
  } catch {
    return { month: currentMonthKey(), used: 0 };
  }
}

function writeStore(store: QuotaStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export type HighlightlyQuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
  month: string;
};

export function getHighlightlyQuotaStatus(): HighlightlyQuotaStatus {
  const store = readStore();
  const limit = HIGHLIGHTLY_MONTHLY_REQUEST_LIMIT;
  return {
    used: store.used,
    limit,
    remaining: Math.max(0, limit - store.used),
    month: store.month,
  };
}

export function canSpendHighlightlyRequests(count = 1): boolean {
  const { remaining } = getHighlightlyQuotaStatus();
  return remaining >= count;
}

export function recordHighlightlyRequests(count = 1): void {
  if (count <= 0) return;
  const store = readStore();
  store.used += count;
  writeStore(store);
}

/** Test-only reset */
export function resetHighlightlyQuotaForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
