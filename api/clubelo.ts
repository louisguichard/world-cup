export const config = {
  runtime: "edge"
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\/api\/clubelo\//, "");
  if (!slug || slug.includes("..")) {
    return new Response("Bad request", { status: 400 });
  }

  const res = await fetch(`http://api.clubelo.com/${slug}`);
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}
