import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel serverless proxy for SofaScore.
 * Injects browser-like headers so SofaScore's edge doesn't 403 us.
 * Allowlisted paths only — anything else returns 403.
 */

const ALLOWED_PREFIXES = ["/sport/football/", "/event/"] as const;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.sofascore.com/",
  Origin: "https://www.sofascore.com",
  "X-Requested-With": "XMLHttpRequest",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = req.query.path;
  const path = "/" + (Array.isArray(segments) ? segments.join("/") : segments ?? "");

  const isAllowed = ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isAllowed) {
    return res.status(403).json({ error: "Path not in allowlist", path });
  }

  const upstream = `https://api.sofascore.com/api/v1${path}`;

  try {
    const upstreamRes = await fetch(upstream, { headers: BROWSER_HEADERS });

    res.status(upstreamRes.status);

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      return res.json({ error: `upstream ${upstreamRes.status}`, body: text });
    }

    const data = await upstreamRes.json();
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: "proxy fetch failed", detail: String(err) });
  }
}
