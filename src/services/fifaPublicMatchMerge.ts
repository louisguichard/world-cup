import type { MergedMatch } from "../types";
import { isResultFinalLocked } from "../lib/liveDataContract";
import { normalizeFifaPublicMatch } from "./adapters/normalizeFifaPublicMatch";
import type { FifaPublicMatch } from "../schemas/fifaPublic";
import { logger } from "./Logger";

export type FifaMergeOutcome = "applied" | "blocked" | "skipped" | "unchanged";

export type FifaMergeStats = {
  applied: number;
  blocked: number;
  skipped: number;
  unchanged: number;
};

function emptyStats(): FifaMergeStats {
  return { applied: 0, blocked: 0, skipped: 0, unchanged: 0 };
}

function resultSnapshot(m: MergedMatch) {
  return {
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    locked: m.locked,
    source: m.source,
  };
}

/** ESPN live/completed rows own scores and lifecycle — FIFA fills metadata only. */
function isEspnAuthorityRow(existing: MergedMatch): boolean {
  return (
    existing.source === "espn" &&
    (existing.status === "live" || existing.status === "completed")
  );
}

function scoresDiffer(
  existing: MergedMatch,
  homeScore: number,
  awayScore: number
): boolean {
  return existing.homeScore !== homeScore || existing.awayScore !== awayScore;
}

/**
 * Overlays FIFA public API match fields onto existing M{n} schedule shells.
 * Preserves ESPN/manual authority; fills scores on model shells only.
 */
export function mergeFifaPublicMatchIntoStore(
  merged: Record<string, MergedMatch>,
  raw: FifaPublicMatch
): FifaMergeOutcome {
  const partial = normalizeFifaPublicMatch(raw);
  const storeKey = partial.id;
  if (!storeKey || !merged[storeKey]) return "unchanged";

  const existing = merged[storeKey];

  if (isResultFinalLocked(existing) || existing.source === "manual") {
    logger.info("FIFA merge skipped — protected row", "fifaPublicMatchMerge", {
      storeKey,
      row: resultSnapshot(existing),
    });
    return "skipped";
  }

  const espnAuthority = isEspnAuthorityRow(existing);
  const next: MergedMatch = { ...existing };
  let blocked = false;
  let touched = false;

  if (partial.fifaMatchId && partial.fifaMatchId !== existing.fifaMatchId) {
    next.fifaMatchId = partial.fifaMatchId;
    touched = true;
  }

  if (partial.date && (!existing.date || existing.source === "model")) {
    next.date = partial.date;
    touched = true;
  }

  if (partial.homeScore !== undefined && partial.awayScore !== undefined) {
    const hasExistingScores =
      existing.homeScore !== undefined && existing.awayScore !== undefined;

    if (
      espnAuthority &&
      hasExistingScores &&
      scoresDiffer(existing, partial.homeScore, partial.awayScore)
    ) {
      logger.warn("FIFA score overwrite blocked — ESPN authority", "fifaPublicMatchMerge", {
        storeKey,
        espn: resultSnapshot(existing),
        fifa: {
          homeScore: partial.homeScore,
          awayScore: partial.awayScore,
          status: partial.status,
        },
      });
      blocked = true;
    } else if (!espnAuthority || !hasExistingScores) {
      next.homeScore = partial.homeScore;
      next.awayScore = partial.awayScore;
      touched = true;
    }
  }

  if (partial.status) {
    if (espnAuthority && partial.status !== existing.status) {
      logger.warn("FIFA status overwrite blocked — ESPN authority", "fifaPublicMatchMerge", {
        storeKey,
        espn: resultSnapshot(existing),
        fifaStatus: partial.status,
      });
      blocked = true;
    } else if (!espnAuthority) {
      next.status = partial.status;
      touched = true;
    }
  }

  if (blocked && !touched) {
    return "blocked";
  }

  if (!touched) {
    return "unchanged";
  }

  merged[storeKey] = next;
  logger.info("FIFA merge applied", "fifaPublicMatchMerge", {
    storeKey,
    before: resultSnapshot(existing),
    after: resultSnapshot(next),
    espnAuthority,
  });
  return blocked ? "blocked" : "applied";
}

/** Merges all FIFA public matches into the store map. */
export function mergeFifaPublicMatchesIntoStore(
  merged: Record<string, MergedMatch>,
  matches: FifaPublicMatch[]
): FifaMergeStats {
  const stats = emptyStats();
  for (const raw of matches) {
    const outcome = mergeFifaPublicMatchIntoStore(merged, raw);
    stats[outcome] += 1;
  }
  return stats;
}
