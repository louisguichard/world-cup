/**
 * WC2026 Backend Server — Hono app.
 * Entry point for the Railway/Fly.io long-running worker deployment.
 * Vercel Functions (api/*.ts) are used for the stateless QueryAPI + PushService.
 *
 * This process hosts:
 * - BullMQ workers (QualificationWorker, PredictionWorker, ReconciliationEngine)
 * - Cron-triggered IntakeWorkers
 * - Admin/internal routes
 */

import { Hono } from "hono";
import { initTelemetry, logger } from "./observability/telemetry.js";
import { IntakeWorker, PROVIDER_CONFIGS } from "./bc1/intakeWorker.js";
import { QualificationWorker } from "./bc2/qualificationWorker.js";
import { PredictionWorker } from "./bc3/predictionWorker.js";
import { createWorker, qualificationQueue, predictionQueue, reconciliationQueue } from "./infra/queues.js";
import { redis } from "./infra/redis.js";
import { STREAM_KEYS } from "./events/types.js";
import type { MatchResultLockedEvent, QualificationChangedEvent, EntityUpdatedEvent } from "./events/types.js";

initTelemetry();

const app = new Hono();

// Health probe for Railway/Fly.io
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ─────────────────────────────────────────────
// BullMQ Worker setup
// ─────────────────────────────────────────────

const qualWorker = new QualificationWorker();
const predWorker = new PredictionWorker();
const intakeWorker = new IntakeWorker();

// Qualification queue consumer
createWorker<{ event: MatchResultLockedEvent }>(
  "qualification",
  async (job) => {
    logger.info("qual_job_start", { jobId: job.id });
    await qualWorker.processMatchLocked(job.data.event);
    logger.info("qual_job_done", { jobId: job.id });
  },
  { concurrency: 2 }
);

// Prediction queue consumer
createWorker<{ event: QualificationChangedEvent | EntityUpdatedEvent }>(
  "prediction",
  async (job) => {
    logger.info("pred_job_start", { jobId: job.id });
    const { event } = job.data;
    if (event.type === "QualificationChangedEvent") {
      await predWorker.processQualificationChanged(event as QualificationChangedEvent);
    } else if (event.type === "EntityUpdatedEvent") {
      await predWorker.processEntityUpdated(event as EntityUpdatedEvent);
    }
    logger.info("pred_job_done", { jobId: job.id });
  },
  { concurrency: 3 }
);

// ─────────────────────────────────────────────
// Redis Streams event router
// Routes events from the intake stream to the appropriate worker queues
// ─────────────────────────────────────────────

async function runEventRouter(): Promise<void> {
  let lastId = "$";
  logger.info("event_router_start");

  while (true) {
    try {
      const results = await redis.xread(
        "COUNT", 20,
        "BLOCK", 2000,
        "STREAMS", STREAM_KEYS.intake,
        lastId
      );

      if (!results) continue;

      for (const [, entries] of results) {
        for (const [id, fieldValues] of entries) {
          lastId = id;

          const fields: Record<string, string> = {};
          for (let i = 0; i < fieldValues.length; i += 2) {
            fields[fieldValues[i]] = fieldValues[i + 1];
          }

          const eventType = fields.type;

          if (eventType === "MatchResultLockedEvent") {
            const event: MatchResultLockedEvent = JSON.parse(fields.payload ?? "{}");
            await qualificationQueue.add("process-match-locked", { event }, { priority: 1 });
            await predictionQueue.add("qual-changed-cascade", { event }, { priority: 2 });
          }

          if (eventType === "QualificationChangedEvent") {
            const event: QualificationChangedEvent = JSON.parse(fields.payload ?? "{}");
            await predictionQueue.add("qual-changed", { event }, { priority: 1 });
          }

          if (eventType === "EntityUpdatedEvent") {
            const event: EntityUpdatedEvent = JSON.parse(fields.payload ?? "{}");
            if (["odds", "recentForm"].some((f) => (event.changedFields ?? []).includes(f))) {
              await predictionQueue.add("entity-updated", { event }, { priority: 3 });
            }
          }
        }
      }
    } catch (err) {
      logger.error("event_router_error", { error: String(err) });
      await sleep(1000);
    }
  }
}

// ─────────────────────────────────────────────
// Intake cron scheduler
// ─────────────────────────────────────────────

function scheduleIntakePolling(): void {
  for (const config of PROVIDER_CONFIGS) {
    const poll = async () => {
      const result = await intakeWorker.poll(config);
      if (!result.success) {
        logger.warn("intake_poll_failed", {
          providerId: config.id,
          error: result.error,
          durationMs: result.durationMs,
        });
      } else {
        logger.info("intake_poll_success", {
          providerId: config.id,
          rawEventId: result.rawEventId,
          durationMs: result.durationMs,
        });
      }
    };

    // First poll immediately, then on schedule
    void poll();
    setInterval(() => { void poll(); }, config.pollIntervalMs);
    logger.info("intake_scheduled", { providerId: config.id, intervalMs: config.pollIntervalMs });
  }
}

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────

void runEventRouter();
scheduleIntakePolling();

const PORT = parseInt(process.env.PORT ?? "3001", 10);

export default {
  port: PORT,
  fetch: app.fetch,
};

logger.info("server_started", { port: PORT });

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
