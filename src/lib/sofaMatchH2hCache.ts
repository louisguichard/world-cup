import { PROFILE_TTL_MS } from "./teamProfileCache";

export const SOFA_H2H_CACHE_KEY = "wc-sofa-h2h-v1";

export type SofaH2hCacheEntry = {
  matchId: string;
  fetchedAt: string;
  homeWins: number;
  awayWins: number;
  draws: number;
  events: Array<{
    id: number;
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore?: number;
    awayScore?: number;
    tournament?: string;
  }>;
};

type Store = {
  version: 1;
  entries: Record<string, SofaH2hCacheEntry>;
};

const EMPTY: Store = { version: 1, entries: {} };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readSofaH2hStore(): Store {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(SOFA_H2H_CACHE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      entries: isRecord(parsed.entries) ? (parsed.entries as Record<string, SofaH2hCacheEntry>) : {},
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeSofaH2hStore(store: Store): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SOFA_H2H_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getCachedSofaH2h(sofaEventId: string): SofaH2hCacheEntry | null {
  return readSofaH2hStore().entries[sofaEventId] ?? null;
}

export function upsertSofaH2h(entry: SofaH2hCacheEntry): void {
  const store = readSofaH2hStore();
  store.entries[entry.matchId] = entry;
  writeSofaH2hStore(store);
}
