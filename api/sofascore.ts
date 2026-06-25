/**
 * Vercel Edge allowlist proxy for SofaScore — production routes via vercel.json rewrites.
 * This module documents allowed path prefixes for security review.
 */
export const SOFASCORE_ALLOWLIST = [
  "/sport/football/",
  "/event/"
] as const;
