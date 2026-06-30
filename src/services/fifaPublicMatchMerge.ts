import type { MergedMatch } from "../types";
import { normalizeFifaPublicMatch } from "./adapters/normalizeFifaPublicMatch";
import type { FifaPublicMatch } from "../schemas/fifaPublic";
import { logger } from "./Logger";

/**
 * Overlays FIFA public API match fields onto existing M{n} schedule shells.
 * Preserves broadcast/venue/ESPN fields; fills scores and status when FIFA has data.
 */
export function mergeFifaPublicMatchIntoStore(
  merged: Record<string, MergedMatch>,
  raw: FifaPublicMatch
): boolean {
  const partial = normalizeFifaPublicMatch(raw);
  const storeKey = partial.id;
  if (!storeKey || !merged[storeKey]) return false;

  const existing = merged[storeKey];
  const next: MergedMatch = {
    ...existing,
    fifaMatchId: partial.fifaMatchId ?? existing.fifaMatchId,
  };

  if (partial.date && (!existing.date || existing.source === "model")) {
    next.date = partial.date;
  }

  if (partial.homeScore !== undefined) next.homeScore = partial.homeScore;
  if (partial.awayScore !== undefined) next.awayScore = partial.awayScore;

  if (partial.status) {
    const espnHasLive =
      existing.source === "espn" && (existing.status === "live" || existing.status === "completed");
    if (!espnHasLive || partial.status === "completed") {
      next.status = partial.status;
    }
  }

  merged[storeKey] = next;
  logger.debug("FIFA public match merged", "fifaPublicMatchMerge", { storeKey });
  return true;
}

/** Merges all FIFA public matches into the store map. Returns merge count. */
export function mergeFifaPublicMatchesIntoStore(
  merged: Record<string, MergedMatch>,
  matches: FifaPublicMatch[]
): number {
  let count = 0;
  for (const raw of matches) {
    if (mergeFifaPublicMatchIntoStore(merged, raw)) count += 1;
  }
  return count;
}
