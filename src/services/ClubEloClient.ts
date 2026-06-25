const cache = new Map<string, { elo: number; at: number }>();
const TTL = 24 * 60 * 60 * 1000;

const SLUGS: Record<string, string> = {
  France: "FRA",
  Brazil: "BRA",
  Argentina: "ARG",
  Germany: "GER",
  Spain: "ESP",
  England: "ENG",
  Mexico: "MEX",
  "United States": "USA"
};

export async function getTeamElo(teamName: string): Promise<number | null> {
  const slug = SLUGS[teamName] ?? teamName.replace(/\s+/g, "");
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < TTL) return cached.elo;

  try {
    const url = typeof window !== "undefined" ? `/api/clubelo/${slug}` : `http://api.clubelo.com/${slug}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ Elo: number }>;
    const elo = rows[0]?.Elo;
    if (typeof elo === "number") {
      cache.set(slug, { elo, at: Date.now() });
      return elo;
    }
  } catch {
    return null;
  }
  return null;
}
