/**
 * GET /api/teams/:teamId/advancement
 * Returns advancement probability across all remaining stages.
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

  const { teamId } = req.query as { teamId: string };

  try {
    const { prisma } = await import("../../../server/src/infra/prisma.js");
    const { cacheGet, cacheSet, cacheKey, CACHE_TTL } = await import(
      "../../../server/src/infra/redis.js"
    );

    const cKey = cacheKey("advancement", teamId);
    const cached = await cacheGet(cKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const probabilities = await prisma.advancementProbability.findMany({
      where: { teamId, isScenario: false },
      orderBy: [{ stage: "asc" }, { createdAt: "desc" }],
      distinct: ["stage"],
    });

    const team = await prisma.canonicalTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      res.status(404).json({ error: `Team ${teamId} not found` });
      return;
    }

    const result = {
      teamId,
      teamName: team.displayName,
      stages: probabilities.map((p) => ({
        stage: p.stage,
        probability: p.probability,
        modelVersion: p.modelVersion,
        updatedAt: p.createdAt.toISOString(),
      })),
    };

    await cacheSet(cKey, result, CACHE_TTL.predictions);
    res.setHeader("Cache-Control", "public, s-maxage=60");
    res.status(200).json(result);
  } catch (err) {
    console.error("[teams/:teamId/advancement]", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
