/**
 * GET  /api/scenarios/:id         — get workspace state
 * POST /api/scenarios/:id/overrides — add/update override (via body action)
 * GET  /api/scenarios/:id/result  — get simulation result (poll or trigger)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { id } = req.query as { id: string };
  const { ScenarioService } = await import("../../server/src/bc3/scenarioService.js");
  const svc = new ScenarioService();

  // Route: /api/scenarios/:id/result
  if (req.url?.includes("/result")) {
    await handleResult(id, req, res, svc);
    return;
  }

  // Route: /api/scenarios/:id/overrides
  if (req.url?.includes("/overrides")) {
    await handleOverrides(id, req, res, svc);
    return;
  }

  // Route: /api/scenarios/:id
  if (req.method === "GET") {
    try {
      const workspace = await svc.get(id);
      if (!workspace) {
        res.status(404).json({ error: `Scenario ${id} not found` });
        return;
      }
      res.status(200).json(workspace);
    } catch (err) {
      console.error("[scenarios/:id]", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  if (req.method === "DELETE") {
    await svc.delete(id);
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleResult(
  id: string,
  req: VercelRequest,
  res: VercelResponse,
  svc: import("../../server/src/bc3/scenarioService.js").ScenarioService
): Promise<void> {
  if (req.method === "GET") {
    const result = await svc.getResult(id);
    if (!result) {
      // Trigger simulation
      try {
        const simResult = await svc.simulate(id);
        res.status(200).json(simResult);
      } catch (err) {
        console.error("[scenarios/:id/result]", err);
        res.status(500).json({ error: "Simulation failed" });
      }
    } else {
      res.status(200).json(result);
    }
  } else if (req.method === "POST") {
    // Explicitly trigger a fresh simulation
    const body = req.body as { iterations?: number; seed?: number };
    try {
      const result = await svc.simulate(id, body.iterations ?? 1000, body.seed);
      res.status(200).json(result);
    } catch (err) {
      console.error("[scenarios/:id/result POST]", err);
      res.status(500).json({ error: "Simulation failed" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

async function handleOverrides(
  id: string,
  req: VercelRequest,
  res: VercelResponse,
  svc: import("../../server/src/bc3/scenarioService.js").ScenarioService
): Promise<void> {
  if (req.method === "POST") {
    const body = req.body as { matchId: string; homeScore: number; awayScore: number; note?: string };
    if (!body.matchId || body.homeScore === undefined || body.awayScore === undefined) {
      res.status(400).json({ error: "matchId, homeScore, awayScore required" });
      return;
    }
    try {
      const workspace = await svc.addOverride(id, body);
      res.status(200).json(workspace);
    } catch (err) {
      console.error("[scenarios/:id/overrides]", err);
      res.status(500).json({ error: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
    const { matchId } = req.query as { matchId: string };
    const workspace = await svc.removeOverride(id, matchId);
    res.status(200).json(workspace);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
