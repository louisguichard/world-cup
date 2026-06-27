const ESPN_WC_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";

/** Fetches live ESPN WC scoreboard for integration tests; returns null when offline or timed out. */
export async function fetchEspnWorldCupScoreboard(timeoutMs = 8_000): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(ESPN_WC_SCOREBOARD_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function skipIfOffline<T>(payload: T | null, run: (data: T) => void): void {
  if (payload == null) {
    console.warn("Skipping live ESPN integration assertion — network unavailable");
    return;
  }
  run(payload);
}
