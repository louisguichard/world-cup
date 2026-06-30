export const config = { runtime: "edge" };

const JSON_HEADERS = { "Content-Type": "application/json" };

export default async function handler(request: Request): Promise<Response> {
  const base = process.env.FIFA_PUBLIC_SERVICE_URL?.replace(/\/$/, "");
  if (!base) {
    return new Response(
      JSON.stringify({ error: "FIFA_PUBLIC_SERVICE_URL is not configured" }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/fifa-public/, "") || "/health";
  const target = `${base}${path}${url.search}`;

  try {
    const res = await fetch(target, {
      headers: { Accept: "application/json" },
    });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "fifa-public proxy fetch failed", detail: String(err) }),
      { status: 502, headers: JSON_HEADERS }
    );
  }
}
