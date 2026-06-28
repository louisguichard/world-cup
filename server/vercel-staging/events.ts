/**
 * GET /api/events — Server-Sent Events push endpoint.
 * Streams EntityUpdatedEvent, QualificationChangedEvent, and PredictionUpdatedEvent
 * to connected React PWA clients.
 *
 * Query params:
 * - filter: comma-separated event types to receive (default: all)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  runtime: "nodejs20.x",
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Parse filter
  const filterParam = req.query.filter;
  const allowedTypes = filterParam
    ? String(filterParam).split(",").map((s) => s.trim())
    : null;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Dynamically import to avoid cold start issues
  const { pushBroadcaster } = await import("../server/src/push/pushService.js");

  function send(data: unknown): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
      (res as unknown as { flush: () => void }).flush();
    }
  }

  // Send initial connection message
  send({ type: "connected", timestamp: new Date().toISOString() });

  // Subscribe to push events
  const unsubscribe = pushBroadcaster.subscribe((msg) => {
    if (allowedTypes && !allowedTypes.includes(msg.type)) return;
    send(msg);
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    send({ type: "heartbeat", timestamp: new Date().toISOString() });
  }, 15_000);

  // Clean up on disconnect
  req.on("close", () => {
    unsubscribe();
    clearInterval(heartbeat);
  });

  req.on("error", () => {
    unsubscribe();
    clearInterval(heartbeat);
  });
}
