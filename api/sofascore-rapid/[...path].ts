export const config = {
  runtime: "edge",
};

const HOST = "sofascore.p.rapidapi.com";

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const prefix = "/api/sofascore-rapid";
  let path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  if (!path.startsWith("/")) path = `/${path}`;

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
        Accept: "application/json",
        "x-rapidapi-host": HOST,
        "x-rapidapi-key": key,
      },
    });

    const contentType = upstreamRes.headers.get("content-type") ?? "application/json";
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "proxy fetch failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
