/**
 * Observability — OpenTelemetry + Sentry integration.
 *
 * Three pillars:
 * 1. Metrics (OTel counters/gauges/histograms → Sentry or Datadog)
 * 2. Distributed traces (intake → identity → reconciliation → qualification → prediction → push)
 * 3. Structured logs (pino-compatible JSON)
 *
 * Call `initTelemetry()` once at process start (server/index.ts).
 */

import { trace, metrics, context } from "@opentelemetry/api";
import type { Tracer, Meter } from "@opentelemetry/api";

export let tracer: Tracer;
export let meter: Meter;

let initialized = false;

export function initTelemetry(): void {
  if (initialized) return;
  initialized = true;

  tracer = trace.getTracer("wc2026", "1.0.0");
  meter = metrics.getMeter("wc2026", "1.0.0");

  // Initialize all metric instruments
  initMetrics(meter);

  console.log("[telemetry] OTel initialized");
}

// ─────────────────────────────────────────────
// Metric instruments
// ─────────────────────────────────────────────

let eventsIngested: ReturnType<Meter["createCounter"]>;
let schemaViolations: ReturnType<Meter["createCounter"]>;
let identityResolutionSuccessRate: ReturnType<Meter["createObservableGauge"]>;
let quarantineQueueDepth: ReturnType<Meter["createObservableGauge"]>;
let canonicalWrites: ReturnType<Meter["createCounter"]>;
let recomputeLatencyMs: ReturnType<Meter["createHistogram"]>;
let predictionShiftDelta: ReturnType<Meter["createHistogram"]>;
let connectedClients: ReturnType<Meter["createObservableGauge"]>;
let cacheHitRate: ReturnType<Meter["createObservableGauge"]>;

function initMetrics(m: Meter): void {
  eventsIngested = m.createCounter("intake.events_ingested", {
    description: "Total provider events ingested",
  });

  schemaViolations = m.createCounter("intake.schema_violations", {
    description: "Total schema validation failures",
  });

  identityResolutionSuccessRate = m.createObservableGauge(
    "identity.resolution_success_rate",
    { description: "Fraction of identity resolutions that succeeded (0-1)" }
  );

  quarantineQueueDepth = m.createObservableGauge(
    "identity.quarantine_queue_depth",
    { description: "Number of unresolved quarantined aliases" }
  );

  canonicalWrites = m.createCounter("recon.canonical_writes", {
    description: "Total canonical entity writes by ReconciliationEngine",
  });

  recomputeLatencyMs = m.createHistogram("qual.recompute_latency_ms", {
    description: "End-to-end qualification recompute latency in milliseconds",
    unit: "ms",
  });

  predictionShiftDelta = m.createHistogram("pred.probability_shift_delta", {
    description: "Magnitude of probability shifts detected by PredictionWorker",
  });

  connectedClients = m.createObservableGauge("push.connected_clients", {
    description: "Number of SSE clients currently connected",
  });

  cacheHitRate = m.createObservableGauge("cache.hit_rate", {
    description: "Cache hit rate per key type (0-1)",
  });
}

// ─────────────────────────────────────────────
// Metric recording helpers
// ─────────────────────────────────────────────

export function recordEventIngested(providerId: string): void {
  eventsIngested?.add(1, { providerId });
}

export function recordSchemaViolation(providerId: string, entityType: string): void {
  schemaViolations?.add(1, { providerId, entityType });
}

export function recordCanonicalWrite(entityType: string): void {
  canonicalWrites?.add(1, { entityType });
}

export function recordRecomputeLatency(groupId: string, latencyMs: number): void {
  recomputeLatencyMs?.record(latencyMs, { groupId });
}

export function recordProbabilityShift(matchId: string, delta: number): void {
  predictionShiftDelta?.record(delta, { matchId });
}

// ─────────────────────────────────────────────
// Distributed trace helpers
// ─────────────────────────────────────────────

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const span = tracer?.startSpan(name, { attributes });
  try {
    const result = await context.with(
      trace.setSpan(context.active(), span),
      fn
    );
    span?.end();
    return result;
  } catch (err) {
    span?.recordException(err as Error);
    span?.setStatus({ code: 2, message: String(err) }); // ERROR
    span?.end();
    throw err;
  }
}

// ─────────────────────────────────────────────
// Structured logger
// ─────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (msg: string, fields?: Record<string, unknown>) => log("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => log("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => log("error", msg, fields),
  debug: (msg: string, fields?: Record<string, unknown>) => log("debug", msg, fields),

  sourceTruthDecision: (
    field: string,
    winner: string,
    losers: string[],
    reason: string
  ) => log("info", "source_truth_decision", { field, winner, losers, reason }),

  quarantineDecision: (
    externalId: string,
    candidates: string[],
    topScore: number,
    threshold: number
  ) => log("info", "quarantine_decision", { externalId, candidates, topScore, threshold }),

  correctionApplied: (
    entityType: string,
    entityId: string,
    field: string,
    analystId: string
  ) => log("info", "correction_applied", { entityType, entityId, field, analystId }),
};

// ─────────────────────────────────────────────
// Sentry alert helpers
// ─────────────────────────────────────────────

/**
 * Raises an alert-level error to Sentry when quarantine depth exceeds threshold.
 * Called from the health check endpoint.
 */
export function alertQuarantineDepth(depth: number, threshold = 20): void {
  if (depth > threshold) {
    logger.error("quarantine_depth_alert", {
      depth,
      threshold,
      message: `Identity quarantine queue depth ${depth} exceeds alert threshold ${threshold}`,
    });
    // In production, integrate with Sentry.captureMessage or Datadog alerting here
  }
}

/**
 * Raises an alert when a provider has not been polled successfully for too long.
 */
export function alertProviderStale(
  providerId: string,
  lastSuccessfulPoll: Date | null,
  expectedIntervalMs: number
): void {
  if (!lastSuccessfulPoll) {
    logger.error("provider_never_polled", { providerId });
    return;
  }

  const staleness = Date.now() - lastSuccessfulPoll.getTime();
  if (staleness > expectedIntervalMs * 3) {
    logger.error("provider_stale_alert", {
      providerId,
      stalenessMs: staleness,
      expectedIntervalMs,
    });
  }
}
