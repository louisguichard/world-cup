import {
  RAPID_PROXY_ROUTES,
  buildUpstreamHeaders,
  isMethodAllowed,
  isPathAllowed,
} from "../_lib/rapidProxyRoutes";

export const config = { runtime: "edge" };

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonError(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const prefix = "/api/rapid";
  let remainder = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  if (!remainder.startsWith("/")) remainder = `/${remainder}`;

  const segments = remainder.split("/").filter(Boolean);
  if (segments.length === 0) {
    return jsonError(404, { error: "Unknown RapidAPI service", path: remainder });
  }

  const serviceId = segments[0];
  const route = RAPID_PROXY_ROUTES[serviceId];
  if (!route) {
    return jsonError(404, { error: "Unknown RapidAPI service", serviceId });
  }

  const upstreamPath = `/${segments.slice(1).join("/")}` || "/";

  if (!isPathAllowed(route, upstreamPath)) {
    return jsonError(403, { error: "Path not in allowlist", serviceId, path: upstreamPath });
  }

  const method = request.method.toUpperCase();
  if (!isMethodAllowed(route, method, upstreamPath)) {
    return jsonError(403, {
      error: "HTTP method not allowed for this path",
      serviceId,
      path: upstreamPath,
      method,
    });
  }

  const rapidKey = process.env.RAPIDAPI_KEY;
  if (!rapidKey) {
    return jsonError(500, { error: "RAPIDAPI_KEY not configured" });
  }

  const upstream = `https://${route.host}${upstreamPath}${url.search}`;
  const body =
    method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE"
      ? await request.text()
      : undefined;

  try {
    const res = await fetch(upstream, {
      method,
      headers: buildUpstreamHeaders(route, rapidKey, method),
      body: body && body.length > 0 ? body : undefined,
    });
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    return jsonError(502, { error: "proxy fetch failed", detail: String(err) });
  }
}
