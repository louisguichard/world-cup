import { Queue, Worker, QueueEvents } from "bullmq";
import type { JobsOptions, WorkerOptions } from "bullmq";
import { QUEUE_NAMES } from "../events/types.js";

const connection = {
  url: process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL,
};

if (!connection.url) {
  throw new Error(
    "UPSTASH_REDIS_URL or REDIS_URL environment variable is required for BullMQ"
  );
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

// ─────────────────────────────────────────────
// Queue definitions
// ─────────────────────────────────────────────

export const intakeQueues: Record<string, Queue> = {
  [QUEUE_NAMES.intakeEspn]: new Queue(QUEUE_NAMES.intakeEspn, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }),
  [QUEUE_NAMES.intakeWcLive]: new Queue(QUEUE_NAMES.intakeWcLive, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }),
  [QUEUE_NAMES.intakeSofascore]: new Queue(QUEUE_NAMES.intakeSofascore, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }),
  [QUEUE_NAMES.intakeZafronix]: new Queue(QUEUE_NAMES.intakeZafronix, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }),
  [QUEUE_NAMES.intakeClubElo]: new Queue(QUEUE_NAMES.intakeClubElo, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }),
};

export const qualificationQueue = new Queue(QUEUE_NAMES.qualification, {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const predictionQueue = new Queue(QUEUE_NAMES.prediction, {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const reconciliationQueue = new Queue(QUEUE_NAMES.reconciliation, {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

// ─────────────────────────────────────────────
// Worker factory
// ─────────────────────────────────────────────

export function createWorker<T>(
  queueName: string,
  processor: (job: { id: string | undefined; name: string; data: T }) => Promise<void>,
  options: Partial<WorkerOptions> = {}
): Worker {
  return new Worker<T>(
    queueName,
    async (job) => {
      await processor({ id: job.id, name: job.name, data: job.data });
    },
    {
      connection,
      concurrency: 3,
      ...options,
    }
  );
}

// ─────────────────────────────────────────────
// Dead-letter queue helpers
// ─────────────────────────────────────────────

export async function moveToDLQ(
  queueName: string,
  jobId: string,
  reason: string
): Promise<void> {
  const dlqKey = `wc2026:dlq:${queueName}`;
  const { redis } = await import("./redis.js");
  await redis.lpush(
    dlqKey,
    JSON.stringify({ jobId, reason, failedAt: new Date().toISOString() })
  );
  await redis.ltrim(dlqKey, 0, 499); // keep last 500 DLQ entries
}

export function createQueueEvents(queueName: string): QueueEvents {
  return new QueueEvents(queueName, { connection });
}
