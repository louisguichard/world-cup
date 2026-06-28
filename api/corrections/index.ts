/**
 * POST /api/corrections — submit field-level correction event
 * GET /api/corrections?entityType=&entityId= — get correction history
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { requireAdminToken } = await import("../../server/src/lib/adminAuth.js");
  const { CorrectionPipeline } = await import(
    "../../server/src/bc1/correctionPipeline.js"
  );
  const pipeline = new CorrectionPipeline();

  if (req.method === "POST") {
    if (!requireAdminToken(req, res)) return;
    const body = req.body as {
      entityType: string;
      entityId: string;
      field: string;
      newValue: unknown;
      analystId: string;
      reason?: string;
    };

    if (!body.entityType || !body.entityId || !body.field || !body.analystId) {
      res.status(400).json({
        error: "entityType, entityId, field, and analystId are required",
      });
      return;
    }

    try {
      const correctionId = await pipeline.submit({
        entityType: body.entityType as import("../../server/src/events/types.js").EntityType,
        entityId: body.entityId,
        field: body.field,
        newValue: body.newValue,
        analystId: body.analystId,
        reason: body.reason,
      });
      res.status(201).json({ correctionId });
    } catch (err) {
      console.error("[corrections POST]", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  if (req.method === "GET") {
    const { entityType, entityId } = req.query as {
      entityType: string;
      entityId: string;
    };

    if (!entityType || !entityId) {
      res.status(400).json({ error: "entityType and entityId are required" });
      return;
    }

    try {
      const history = await pipeline.getHistory(
        entityType as import("../../server/src/events/types.js").EntityType,
        entityId
      );
      res.status(200).json(history);
    } catch (err) {
      console.error("[corrections GET]", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
