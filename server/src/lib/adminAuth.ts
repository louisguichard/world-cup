/**
 * Dev/prod admin token gate for correction and quarantine write APIs.
 * Clerk integration deferred — set DEV_ADMIN_TOKEN in .env.local.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export function requireAdminToken(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.DEV_ADMIN_TOKEN;
  if (!expected) {
    res.status(503).json({
      error: "Admin writes disabled — set DEV_ADMIN_TOKEN in environment",
    });
    return false;
  }

  const header = req.headers.authorization;
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : (req.headers["x-admin-token"] as string | undefined);

  if (!token || token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}
