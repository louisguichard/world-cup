/**
 * Health API handler — per-provider ingestion health, cache freshness, queue depths.
 */

import { prisma } from "../infra/prisma.js";
import { redis, CACHE_TTL, cacheSet, cacheGet, cacheKey } from "../infra/redis.js";
import { IdentityService } from "../bc1/identityService.js";

const identityService = new IdentityService();

export interface HealthResponse {
  status: "healthy" | "degraded" | "critical";
  timestamp: string;
  providers: Array<{
    providerId: string;
    status: string;
    lastSuccessfulPoll: string | null;
    lastError: string | null;
    consecutiveErrors: number;
    circuitState: string;
  }>;
  quarantineDepth: number;
  redisConnected: boolean;
  dbConnected: boolean;
}

export async function getHealth(): Promise<HealthResponse> {
  const cKey = cacheKey("health", "status");
  const cached = await cacheGet<HealthResponse>(cKey);
  if (cached) return cached;

  const [providers, quarantineDepth, redisOk, dbOk] = await Promise.allSettled([
    prisma.providerHealth.findMany({ orderBy: { updatedAt: "desc" } }),
    identityService.getQuarantineDepth(),
    redis.ping().then(() => true).catch(() => false),
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ]);

  const providerData =
    providers.status === "fulfilled" ? providers.value : [];
  const depth = quarantineDepth.status === "fulfilled" ? quarantineDepth.value : -1;
  const rOk = redisOk.status === "fulfilled" ? redisOk.value : false;
  const dOk = dbOk.status === "fulfilled" ? dbOk.value : false;

  const criticalProviders = providerData.filter(
    (p) => p.status === "down" || p.consecutiveErrors >= 10
  );
  const degradedProviders = providerData.filter(
    (p) => p.status === "degraded" || p.consecutiveErrors > 0
  );

  const status: HealthResponse["status"] =
    !dOk || criticalProviders.length > 0
      ? "critical"
      : degradedProviders.length > 0 || depth > 20
      ? "degraded"
      : "healthy";

  const response: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    providers: providerData.map((p) => ({
      providerId: p.providerId,
      status: p.status,
      lastSuccessfulPoll: p.lastSuccessfulPoll?.toISOString() ?? null,
      lastError: p.lastErrorMessage,
      consecutiveErrors: p.consecutiveErrors,
      circuitState: p.circuitState,
    })),
    quarantineDepth: depth,
    redisConnected: rOk as boolean,
    dbConnected: dOk as boolean,
  };

  await cacheSet(cKey, response, CACHE_TTL.health);
  return response;
}
