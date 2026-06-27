export const config = { runtime: "edge" };

const HOST = "zafronix-fifa-world-cup-api.p.rapidapi.com";

const ALLOWED_PREFIXES = [
  "/tournaments",
  "/teams",
  "/matches",
  "/bracket",
  "/standings",
  "/stadiums",
  "/trivia",
  "/search",
  "/aggregates",
  "/compare",
  "/health",
  "/players",
  "/referees",
  "/me",
  "/sandbox",
] as const;

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isAllowed(path: string): boolean {
  if (path === "/" || path === "") return true;
  return ALLOWED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`)
  );
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

  const method = request.method.toUpperCase();
  if (MUTATING_METHODS.has(method) && !path.startsWith("/matches/")) {
    return new Response(JSON.stringify({ error: "Mutating requests only allowed on /matches/*", path }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rapidKey = process.env.RAPIDAPI_KEY;
  if (!rapidKey) {
    return new Response(JSON.stringify({ error: "RAPIDAPI_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstreamHeaders: Record<string, string> = {
    Accept: "application/json",
    "x-rapidapi-host": HOST,
    "x-rapidapi-key": rapidKey,
  };

  if (MUTATING_METHODS.has(method)) {
    upstreamHeaders["Content-Type"] = "application/json";
  }

  const zafronixKey = process.env.ZAFRONIX_API_KEY;
  if (zafronixKey) {
    upstreamHeaders["X-API-Key"] = zafronixKey;
  }

  const upstream = `https://${HOST}${path}${url.search}`;
  const body =
    MUTATING_METHODS.has(method) || method === "POST" || method === "PATCH"
      ? await request.text()
      : undefined;

  try {
    const res = await fetch(upstream, {
      method,
      headers: upstreamHeaders,
      body: body && body.length > 0 ? body : undefined,
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "proxy fetch failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
