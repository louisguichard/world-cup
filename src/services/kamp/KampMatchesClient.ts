import { KAMP_MATCHES_URL } from "../../config/kampMatchesEndpoints";
import {
  KampMatchesResponseSchema,
  type KampMatchRecord,
} from "../../schemas/kampMatches";
import { logger } from "../Logger";

const CACHE_KEY = "wc-kamp-matches-v1";
const CACHE_TTL_MS = 10 * 60_000;

type CacheEntry = {
  fetchedAt: number;
  records: KampMatchRecord[];
};

let memoryCache: CacheEntry | null = null;

function readSessionCache(): CacheEntry | null {
  if (typeof sessionStorage === "undefined") return memoryCache;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return memoryCache;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    memoryCache = parsed;
    return parsed;
  } catch {
    return memoryCache;
  }
}

function writeSessionCache(entry: CacheEntry): void {
  memoryCache = entry;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota or private mode
  }
}

function flattenBuckets(
  buckets: ReturnType<typeof KampMatchesResponseSchema.parse>
): KampMatchRecord[] {
  const out: KampMatchRecord[] = [];
  for (const day of buckets) {
    for (const match of day.matches) {
      out.push({ ...match, date: day.date, fase: day.fase });
    }
  }
  return out;
}

async function loadBundledFallback(): Promise<KampMatchRecord[] | null> {
  try {
    const mod = await import("../../data/generated/kampMatches.json");
    const parsed = KampMatchesResponseSchema.safeParse(mod.default ?? mod);
    if (!parsed.success) return null;
    return flattenBuckets(parsed.data);
  } catch {
    return null;
  }
}

async function fetchRemote(): Promise<KampMatchRecord[]> {
  const res = await fetch(KAMP_MATCHES_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kamp matches fetch failed: ${res.status}`);
  const json: unknown = await res.json();
  const parsed = KampMatchesResponseSchema.parse(json);
  return flattenBuckets(parsed);
}

/** Synchronous read of warmed session/memory cache (for event fallback). */
export function getCachedKampRecords(): KampMatchRecord[] | null {
  return readSessionCache()?.records ?? memoryCache?.records ?? null;
}

/** Flat index of andrekamp match records — session-cached, bundled fallback on failure. */
export async function fetchKampMatchesIndex(): Promise<KampMatchRecord[]> {
  const cached = readSessionCache();
  if (cached) return cached.records;

  try {
    const records = await fetchRemote();
    writeSessionCache({ fetchedAt: Date.now(), records });
    return records;
  } catch (error) {
    logger.warn("Kamp matches remote fetch failed — trying bundled fallback", "KampMatchesClient", {
      error: error instanceof Error ? error.message : String(error),
    });
    const bundled = await loadBundledFallback();
    if (bundled) {
      writeSessionCache({ fetchedAt: Date.now(), records: bundled });
      return bundled;
    }
    throw error;
  }
}

export function kampMatchKey(
  date: string,
  homeAbbrev: string,
  awayAbbrev: string
): string {
  return `${date}|${homeAbbrev.toUpperCase()}|${awayAbbrev.toUpperCase()}`;
}

export function buildKampMatchIndex(
  records: KampMatchRecord[],
  resolveAbbrev: (name: string) => string | undefined
): Map<string, KampMatchRecord> {
  const index = new Map<string, KampMatchRecord>();
  for (const record of records) {
    const home = resolveAbbrev(record.team_1);
    const away = resolveAbbrev(record.team_2);
    if (!home || !away) continue;
    index.set(kampMatchKey(record.date, home, away), record);
  }
  return index;
}

/** Test-only reset */
export function resetKampMatchesCacheForTests(): void {
  memoryCache = null;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
  }
}
