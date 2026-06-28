import { Redis } from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
  // eslint-disable-next-line no-var
  var __redisSub: Redis | undefined;
}

function createRedis(lazyConnect = false): Redis {
  const url = process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "UPSTASH_REDIS_URL or REDIS_URL environment variable is required"
    );
  }
  return new Redis(url, {
    lazyConnect,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });
}

/** Main Redis client — used for cache reads/writes and pub/sub. */
export const redis: Redis = globalThis.__redis ?? createRedis();

/** Dedicated subscriber client — ioredis cannot share a connection for sub + commands. */
export const redisSub: Redis =
  globalThis.__redisSub ?? createRedis(true);

if (process.env.NODE_ENV !== "production") {
  globalThis.__redis = redis;
  globalThis.__redisSub = redisSub;
}

// ─────────────────────────────────────────────
// Cache helpers
// ─────────────────────────────────────────────

export const CACHE_TTL = {
  liveMatch: 10,       // seconds
  standings: 30,
  predictions: 300,    // 5 min
  qualification: 60,
  health: 15,
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export function cacheKey(...parts: string[]): string {
  return `wc2026:cache:${parts.join(":")}`;
}

// ─────────────────────────────────────────────
// Redis Streams helpers (EventBus)
// ─────────────────────────────────────────────

export async function streamPublish(
  streamKey: string,
  event: Record<string, string>
): Promise<string> {
  return redis.xadd(streamKey, "*", ...Object.entries(event).flat()) as Promise<string>;
}

export async function streamRead(
  streamKey: string,
  lastId: string,
  count = 10
): Promise<Array<{ id: string; fields: Record<string, string> }>> {
  const results = await redis.xread(
    "COUNT",
    count,
    "STREAMS",
    streamKey,
    lastId
  );
  if (!results) return [];
  const [, entries] = results[0];
  return entries.map(([id, fieldValues]) => {
    const fields: Record<string, string> = {};
    for (let i = 0; i < fieldValues.length; i += 2) {
      fields[fieldValues[i]] = fieldValues[i + 1];
    }
    return { id, fields };
  });
}
