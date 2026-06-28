/**
 * PushService — Server-Sent Events fan-out after recompute events.
 * Reads from the Redis push stream and broadcasts to connected SSE clients.
 *
 * v1: SSE (Vercel Functions compatible)
 * v2 upgrade path: WebSocket / Ably when WebSocket support is needed
 *
 * Events emitted:
 * - EntityUpdatedEvent
 * - QualificationChangedEvent
 * - PredictionUpdatedEvent
 * - TeamAdvanced
 * - TeamEliminated
 */

import { redis } from "../infra/redis.js";
import { STREAM_KEYS } from "../events/types.js";

export type PushEventType =
  | "EntityUpdatedEvent"
  | "QualificationChangedEvent"
  | "PredictionUpdatedEvent"
  | "TeamAdvanced"
  | "TeamEliminated"
  | "heartbeat";

export interface PushMessage {
  type: PushEventType;
  payload: unknown;
  id: string;
  timestamp: string;
}

// ─────────────────────────────────────────────
// In-process subscriber registry
// (for single-instance dev; use Redis pub/sub or Ably in multi-instance prod)
// ─────────────────────────────────────────────

type Subscriber = (msg: PushMessage) => void;

class PushBroadcaster {
  private subscribers = new Set<Subscriber>();
  private streamLastId = "$";
  private polling = false;

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    if (!this.polling) this.startPolling();
    return () => this.subscribers.delete(cb);
  }

  private startPolling(): void {
    this.polling = true;
    void this.pollLoop();
  }

  private async pollLoop(): Promise<void> {
    while (this.subscribers.size > 0) {
      try {
        const results = await redis.xread(
          "COUNT", 50,
          "BLOCK", 2000,
          "STREAMS", STREAM_KEYS.push,
          this.streamLastId
        );

        if (results && results.length > 0) {
          const [, entries] = results[0];
          for (const [id, fieldValues] of entries) {
            this.streamLastId = id;
            const fields: Record<string, string> = {};
            for (let i = 0; i < fieldValues.length; i += 2) {
              fields[fieldValues[i]] = fieldValues[i + 1];
            }

            const msg: PushMessage = {
              type: (fields.type ?? "EntityUpdatedEvent") as PushEventType,
              payload: fields.payload ? JSON.parse(fields.payload) : {},
              id,
              timestamp: new Date().toISOString(),
            };

            for (const sub of this.subscribers) {
              try { sub(msg); } catch { /* individual subscriber errors don't block others */ }
            }
          }
        }
      } catch {
        // Stream polling errors are transient — retry with backoff
        await sleep(1000);
      }
    }
    this.polling = false;
  }
}

export const pushBroadcaster = new PushBroadcaster();

// ─────────────────────────────────────────────
// SSE response helper
// ─────────────────────────────────────────────

/**
 * Creates a ReadableStream suitable for an SSE response.
 * The stream sends a heartbeat every 15s to keep connections alive.
 */
export function createSseStream(
  filter?: (msg: PushMessage) => boolean
): ReadableStream {
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(msg: PushMessage): void {
        const data = `data: ${JSON.stringify(msg)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          cleanup();
        }
      }

      function cleanup(): void {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      }

      // Subscribe to push events
      unsubscribe = pushBroadcaster.subscribe((msg) => {
        if (!filter || filter(msg)) send(msg);
      });

      // Heartbeat to prevent connection timeout
      heartbeatInterval = setInterval(() => {
        send({
          type: "heartbeat",
          payload: {},
          id: `hb-${Date.now()}`,
          timestamp: new Date().toISOString(),
        });
      }, 15_000);
    },

    cancel() {
      // Stream closed by client
    },
  });
}

/**
 * Manually publishes a message to the push stream.
 * Used by workers to notify connected clients after recompute.
 */
export async function publishToPushStream(
  type: PushEventType,
  payload: unknown
): Promise<void> {
  await redis.xadd(
    STREAM_KEYS.push,
    "*",
    "type", type,
    "payload", JSON.stringify(payload)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
