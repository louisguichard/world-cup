const CACHE_TTL_MS = 30 * 60 * 1000;

type CacheEnvelope<T> = {
  savedAt: number;
  data: T;
};

export function readSessionCache<T>(key: string, ttlMs = CACHE_TTL_MS): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || typeof (parsed as CacheEnvelope<T>).savedAt !== "number") {
      return null;
    }
    if (Date.now() - (parsed as CacheEnvelope<T>).savedAt > ttlMs) return null;
    return (parsed as CacheEnvelope<T>).data;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, data: T): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data };
    sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* ignore quota */
  }
}
