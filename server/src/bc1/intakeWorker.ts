/**
 * IntakeWorker — per-provider scheduled poller.
 * Fetches from a provider endpoint, validates via ZodValidator,
 * writes to RawEventLog, then hands off to IdentityService + ReconciliationEngine.
 */

import { ZodValidator } from "./validator.js";
import { RawEventLog } from "./rawEventLog.js";
import { prisma } from "../infra/prisma.js";
import { redis } from "../infra/redis.js";
import type { ProviderId } from "./schemas/providerSchemas.js";
import type { EntityType } from "../events/types.js";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  pollIntervalMs: number;
  headers: Record<string, string>;
  entityType: EntityType;
  buildUrl: (baseUrl: string) => string;
}

export interface IntakeResult {
  providerId: string;
  success: boolean;
  rawEventId?: string;
  error?: string;
  durationMs: number;
}

const validator = new ZodValidator();
const rawLog = new RawEventLog();

export class IntakeWorker {
  private circuitBreakers = new Map<
    string,
    { state: "CLOSED" | "OPEN" | "HALF_OPEN"; failures: number; lastAttempt: Date }
  >();

  async poll(config: ProviderConfig): Promise<IntakeResult> {
    const start = Date.now();

    // Circuit breaker check
    const breaker = this.circuitBreakers.get(config.id);
    if (breaker?.state === "OPEN") {
      const elapsed = Date.now() - breaker.lastAttempt.getTime();
      if (elapsed < 30_000) {
        return {
          providerId: config.id,
          success: false,
          error: "Circuit breaker OPEN",
          durationMs: Date.now() - start,
        };
      }
      // Transition to HALF_OPEN
      breaker.state = "HALF_OPEN";
    }

    try {
      const url = config.buildUrl(config.baseUrl);
      const response = await fetch(url, {
        headers: config.headers,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const payload: unknown = await response.json();

      // Wire-boundary validation
      const validation = await validator.validate(config.id, payload, config.entityType);
      if (!validation.ok) {
        await this.recordHealth(config.id, false, `Schema violation: ${validation.violations.join("; ")}`);
        return {
          providerId: config.id,
          success: false,
          error: `Schema validation failed: ${validation.violations.join("; ")}`,
          durationMs: Date.now() - start,
        };
      }

      // Append to immutable raw event log
      const rawEventId = await rawLog.append(config.id, config.entityType, payload, {
        schemaVersion: "1",
      });

      // Record successful poll
      await this.recordHealth(config.id, true);
      this.resetCircuitBreaker(config.id);

      // Publish to Redis stream for downstream processing
      await redis.xadd(
        "wc2026:stream:intake",
        "*",
        "type", "RawProviderEvent",
        "providerId", config.id,
        "entityType", config.entityType,
        "rawEventId", rawEventId,
        "ingestedAt", new Date().toISOString()
      );

      return {
        providerId: config.id,
        success: true,
        rawEventId,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.recordHealth(config.id, false, message);
      this.incrementCircuitBreaker(config.id);

      return {
        providerId: config.id,
        success: false,
        error: message,
        durationMs: Date.now() - start,
      };
    }
  }

  private async recordHealth(
    providerId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.providerHealth.upsert({
        where: { providerId },
        update: {
          status: success ? "healthy" : "degraded",
          lastSuccessfulPoll: success ? new Date() : undefined,
          lastErrorMessage: success ? null : errorMessage,
          consecutiveErrors: success ? 0 : { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          providerId,
          status: success ? "healthy" : "degraded",
          lastSuccessfulPoll: success ? new Date() : undefined,
          lastErrorMessage: errorMessage,
          consecutiveErrors: success ? 0 : 1,
        },
      });
    } catch {
      // Health recording is best-effort
    }
  }

  private resetCircuitBreaker(providerId: string): void {
    this.circuitBreakers.set(providerId, {
      state: "CLOSED",
      failures: 0,
      lastAttempt: new Date(),
    });
  }

  private incrementCircuitBreaker(providerId: string): void {
    const current = this.circuitBreakers.get(providerId) ?? {
      state: "CLOSED" as const,
      failures: 0,
      lastAttempt: new Date(),
    };
    const failures = current.failures + 1;
    const state = failures >= 5 ? "OPEN" : current.state;
    this.circuitBreakers.set(providerId, {
      state,
      failures,
      lastAttempt: new Date(),
    });
  }
}

// ─────────────────────────────────────────────
// Provider configurations
// ─────────────────────────────────────────────

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: "espn",
    name: "ESPN API",
    baseUrl: "https://site.api.espn.com",
    pollIntervalMs: 30_000,
    headers: {},
    entityType: "match",
    buildUrl: (base) =>
      `${base}/apis/site/v2/sports/soccer/fifa.world/scoreboard`,
  },
  {
    id: "wc-live",
    name: "WC2026 Live",
    baseUrl: "https://api.wc2026.rapidapi.com",
    pollIntervalMs: 15_000,
    headers: {
      "x-rapidapi-host": "wc-2026.p.rapidapi.com",
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
    entityType: "match",
    buildUrl: (base) => `${base}/matches`,
  },
  {
    id: "zafronix",
    name: "Zafronix",
    baseUrl: "https://zafronix.p.rapidapi.com",
    pollIntervalMs: 60_000,
    headers: {
      "x-rapidapi-host": "zafronix.p.rapidapi.com",
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
    entityType: "match",
    buildUrl: (base) => `${base}/matches/live`,
  },
  {
    id: "clubelo",
    name: "ClubElo",
    baseUrl: "http://api.clubelo.com",
    pollIntervalMs: 3_600_000, // hourly
    headers: {},
    entityType: "team",
    buildUrl: (base) => `${base}/FIFA`,
  },
];
