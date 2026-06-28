/**
 * POST /api/scenarios — create analyst workspace
 * GET /api/scenarios — list active scenarios (ephemeral, Redis-backed)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === "POST") {
    await handleCreate(req, res);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { ScenarioService } = await import("../../server/src/bc3/scenarioService.js");
  const svc = new ScenarioService();

  const body = req.body as {
    analystId: string;
    baseSnapshotId: string;
    overrides?: Array<{ matchId: string; homeScore: number; awayScore: number }>;
    description?: string;
  };

  if (!body.analystId || !body.baseSnapshotId) {
    res.status(400).json({ error: "analystId and baseSnapshotId are required" });
    return;
  }

  try {
    const workspace = await svc.create(
      body.analystId,
      body.baseSnapshotId,
      body.overrides ?? [],
      body.description
    );
    res.status(201).json(workspace);
  } catch (err) {
    console.error("[scenarios API]", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
