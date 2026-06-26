export const config = {
  runtime: "edge",
};

const HOST = "sportapi7.p.rapidapi.com";

const ALLOWED_PREFIXES = [
  "/api/v1/category/1468/scheduled-events/",
  "/api/v1/event/",
] as const;

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const prefix = "/api/sportapi";
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
    const upstreamRes = await fetch(upstream, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-rapidapi-host": HOST,
        "x-rapidapi-key": key,
      },
    });

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "proxy fetch failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
