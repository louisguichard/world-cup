/**
 * GET /api/predictions/:matchId
 * Returns the latest prediction with factor contributions for a match.
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

  const { matchId } = req.query as { matchId: string };

  try {
    const { prisma } = await import("../../server/src/infra/prisma.js");
    const { cacheGet, cacheSet, cacheKey, CACHE_TTL } = await import(
      "../../server/src/infra/redis.js"
    );

    const cKey = cacheKey("prediction", matchId);
    const cached = await cacheGet(cKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=60");
      res.status(200).json(cached);
      return;
    }

    const snapshot = await prisma.predictionSnapshot.findFirst({
      where: { matchId, isScenario: false },
      orderBy: { createdAt: "desc" },
    });

    if (!snapshot) {
      res.status(404).json({ error: `No prediction found for match ${matchId}` });
      return;
    }

    const result = {
      matchId,
      homeWinP: snapshot.homeWinP,
      drawP: snapshot.drawP,
      awayWinP: snapshot.awayWinP,
      modelVersion: snapshot.modelVersion,
      factorContributions: snapshot.factorContributions,
      createdAt: snapshot.createdAt.toISOString(),
    };

    await cacheSet(cKey, result, CACHE_TTL.predictions);
    res.setHeader("Cache-Control", "public, s-maxage=60");
    res.status(200).json(result);
  } catch (err) {
    console.error("[predictions API]", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
