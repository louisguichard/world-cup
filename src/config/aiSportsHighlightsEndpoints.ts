/** AI Sports Highlights API on RapidAPI — AI-generated match recaps. */
export const AI_SPORTS_HIGHLIGHTS_HOST =
  "ai-sports-highlights-api-football-basketball-tennis.p.rapidapi.com";

export const AI_HIGHLIGHTS_DEFAULT_LANGUAGE = "en";

function q(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const aiSportsHighlightsEndpoints = {
  /** POST — generate AI match highlights recap (sync when noqueue=1). */
  generateHighlights: (opts?: { noqueue?: boolean }) =>
    `/generateHighlights${q({ noqueue: opts?.noqueue ? 1 : undefined })}`,
} as const;
