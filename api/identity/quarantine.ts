/**
 * GET /api/identity/quarantine — analyst review queue
 * PUT /api/identity/quarantine?aliasId= — resolve quarantined alias
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const { IdentityService } = await import("../../server/src/bc1/identityService.js");
  const svc = new IdentityService();

  if (req.method === "GET") {
    const page = parseInt(String(req.query.page ?? "0"), 10);
    const pageSize = parseInt(String(req.query.pageSize ?? "50"), 10);

    try {
      const result = await svc.getQuarantineQueue(page, pageSize);
      res.status(200).json({
        items: result.items,
        total: result.total,
        page,
        pageSize,
        hasMore: page * pageSize + result.items.length < result.total,
      });
    } catch (err) {
      console.error("[identity/quarantine GET]", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  if (req.method === "PUT") {
    const { requireAdminToken } = await import("../../server/src/lib/adminAuth.js");
    if (!requireAdminToken(req, res)) return;

    const { aliasId } = req.query as { aliasId: string };
    const body = req.body as {
      resolution: "APPROVED" | "REJECTED" | "NEW_ENTITY";
      canonicalId?: string;
      resolvedBy: string;
    };

    if (!body.resolution || !body.resolvedBy) {
      res.status(400).json({ error: "resolution and resolvedBy are required" });
      return;
    }

    try {
      await svc.resolveQuarantine(
        aliasId,
        body.resolution,
        body.canonicalId ?? null,
        body.resolvedBy
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[identity/quarantine PUT]", err);
      res.status(500).json({ error: "Internal server error" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
