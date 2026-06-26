export const config = { runtime: "edge" };

const HOST = "world-cup-2026-live-api.p.rapidapi.com";

const ALLOWED_PREFIXES = [
  "/wc/draw",
  "/wc/live",
  "/wc/standings",
  "/wc/match/",
  "/wc/commentary/",
  "/wc/lineups/",
  "/wc/stats/",
] as const;

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const prefix = "/api/wc-live";
  let path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  if (!path.startsWith("/")) path = `/${path}`;

  if (!isAllowed(path)) {
    return new Response(JSON.stringify({ error: "Path not in allowlist", path }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "RAPIDAPI_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = `https://${HOST}${path}${url.search}`;
  try {
    const res = await fetch(upstream, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-rapidapi-host": HOST,
        "x-rapidapi-key": key,
      },
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "proxy fetch failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
