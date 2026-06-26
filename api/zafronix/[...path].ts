export const config = { runtime: "edge" };

const BASE = "https://api.zafronix.com";

const ALLOWED_PREFIXES = ["/tournaments/", "/matches/", "/teams/", "/trivia/"] as const;

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const prefix = "/api/zafronix";
  let path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  if (!path.startsWith("/")) path = `/${path}`;

  if (!isAllowed(path)) {
    return new Response(JSON.stringify({ error: "Path not in allowlist", path }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = process.env.ZAFRONIX_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "ZAFRONIX_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = `${BASE}${path}${url.search}`;
  try {
    const res = await fetch(upstream, {
      headers: {
        Accept: "application/json",
        "X-API-Key": key,
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
