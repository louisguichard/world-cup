export const config = { runtime: "edge" };

const JSON_HEADERS = { "Content-Type": "application/json" };

const ESPN_WEB_HOST = "site.web.api.espn.com";
const ESPN_WEB_ALLOWED = ["/apis/site/v2/sports/soccer/fifa.world/playbyplay"] as const;

const BROWSER_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function isEspnWebAllowed(path: string): boolean {
  return ESPN_WEB_ALLOWED.some((p) => path === p || path.startsWith(`${p}?`));
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const captured = url.searchParams.get("path") ?? url.searchParams.get("upstream");
  let path =
    captured != null && captured !== ""
      ? captured.startsWith("/")
        ? captured
        : `/${captured}`
      : url.pathname;

  if (!captured) {
    if (path.startsWith("/api/proxy/espn-web")) {
      path = path.slice("/api/proxy/espn-web".length);
    } else if (path.startsWith("/api/espn-web")) {
      path = path.slice("/api/espn-web".length);
    }
  }

  if (!path.startsWith("/")) path = `/${path}`;

  if (!isEspnWebAllowed(path)) {
    return new Response(JSON.stringify({ error: "Path not in allowlist", path }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }

  const forwardSearch = new URLSearchParams(url.searchParams);
  forwardSearch.delete("path");
  forwardSearch.delete("upstream");
  const qs = forwardSearch.toString();
  const upstreamUrl = `https://${ESPN_WEB_HOST}${path}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(upstreamUrl, { headers: BROWSER_HEADERS });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "proxy fetch failed", detail: String(err) }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }
}
