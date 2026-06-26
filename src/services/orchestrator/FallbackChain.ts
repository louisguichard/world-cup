import type { SourceId } from "../../types";
import { logger } from "../Logger";

export const MATCH_SOURCE_PRIORITY: SourceId[] = [
  "wclive",
  "espn",
  "sportapi7",
  "zafronix",
  "sofascore",
  "freeapi",
  "static",
];

export const STANDINGS_SOURCE_PRIORITY: SourceId[] = [
  "wclive",
  "espn",
  "zafronix",
  "wc2026teams",
  "static",
];

export const TEAM_SOURCE_PRIORITY: SourceId[] = [
  "zafronix",
  "wc2026teams",
  "freeapi",
  "sofascore",
  "espn",
  "static",
];

export type FallbackResult<T> = {
  data: T;
  source: SourceId;
  usedFallback: boolean;
};

/** Tries sources in priority order; returns first success or static fallback. */
export async function fetchWithFallback<T>(
  sources: SourceId[],
  fetchers: Partial<Record<SourceId, () => Promise<T>>>,
  fallback: T
): Promise<FallbackResult<T>> {
  for (const source of sources) {
    if (source === "static") {
      return { data: fallback, source: "static", usedFallback: true };
    }

    const fetcher = fetchers[source];
    if (!fetcher) continue;

    try {
      const data = await fetcher();
      if (data !== null && data !== undefined) {
        return { data, source, usedFallback: false };
      }
    } catch (error) {
      logger.warn(`FallbackChain: ${source} failed`, "FallbackChain", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { data: fallback, source: "static", usedFallback: true };
}
