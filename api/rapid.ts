import {
  RAPID_PROXY_ROUTES,
  buildUpstreamHeaders,
  isMethodAllowed,
  isPathAllowed,
} from "./_lib/rapidProxyRoutes";

export const config = { runtime: "edge" };

const JSON_HEADERS = { "Content-Type": "application/json" };

const LEGACY_PREFIXES = Object.keys(RAPID_PROXY_ROUTES).map((id) => `/api/${id}`);

function jsonError(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function resolveRapidPath(url: URL): { serviceId: string; upstreamPath: string } | null {
  const service = url.searchParams.get("service");
  const upstream = url.searchParams.get("upstream") ?? url.searchParams.get("path");
  if (service) {
    const upstreamPath =
      upstream == null || upstream === ""
        ? "/"
        : upstream.startsWith("/")
          ? upstream
          : `/${upstream}`;
    return { serviceId: service, upstreamPath };
  }

  const pathname = url.pathname;
  if (pathname.startsWith("/api/rapid/")) {
    const remainder = pathname.slice("/api/rapid".length);
    const segments = remainder.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    return {
      serviceId: segments[0],
      upstreamPath: `/${segments.slice(1).join("/")}` || "/",
    };
  }

  for (const prefix of LEGACY_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const serviceId = prefix.slice("/api/".length);
      const upstreamPath = pathname.slice(prefix.length) || "/";
      return { serviceId, upstreamPath: upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}` };
    }
  }

  return null;
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const resolved = resolveRapidPath(url);
  if (!resolved) {
    return jsonError(404, { error: "Unknown RapidAPI service", path: url.pathname });
  }

  const { serviceId, upstreamPath } = resolved;
  const route = RAPID_PROXY_ROUTES[serviceId];
  if (!route) {
    return jsonError(404, { error: "Unknown RapidAPI service", serviceId });
  }

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

  const forwardSearch = new URLSearchParams(url.searchParams);
  forwardSearch.delete("service");
  forwardSearch.delete("upstream");
  forwardSearch.delete("path");
  const qs = forwardSearch.toString();
  const upstreamUrl = `https://${route.host}${upstreamPath}${qs ? `?${qs}` : ""}`;
  const body =
    method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE"
      ? await request.text()
      : undefined;

  try {
    const res = await fetch(upstreamUrl, {
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
