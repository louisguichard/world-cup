/**
 * GET /api/health — per-provider ingestion health, cache freshness, queue depths.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { getHealth } = await import("../server/src/api/health.js");
    const health = await getHealth();

    const statusCode = health.status === "critical" ? 503 : 200;
    res.setHeader("Cache-Control", "public, s-maxage=10");
    res.status(statusCode).json(health);
  } catch (err) {
    console.error("[health API]", err);
    res.status(500).json({
      status: "critical",
      error: "Health check failed",
      timestamp: new Date().toISOString(),
    });
  }
}
