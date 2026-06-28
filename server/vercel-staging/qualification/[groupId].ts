/**
 * GET /api/qualification/:groupId
 * Returns current qualification snapshot for a group.
 * Optional ?asOf=ISO timestamp for historical audit.
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

  const { groupId } = req.query as { groupId: string };
  const asOf = req.query.asOf ? String(req.query.asOf) : undefined;

  try {
    const { getGroupQualification } = await import(
      "../../server/src/api/qualification.js"
    );
    const result = await getGroupQualification(groupId, asOf);

    if (!result) {
      res.status(404).json({ error: `No qualification data found for group ${groupId}` });
      return;
    }

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    res.status(200).json(result);
  } catch (err) {
    console.error("[qualification API]", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
