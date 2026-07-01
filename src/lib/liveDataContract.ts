import type { MergedMatch } from "../types";
import { isMergedMatchInActivePhase } from "./matchLifecycle";

/**
 * Narrow live-data contract (2026-06-30).
 *
 * Bug → violated layer (for prioritization):
 *
 * | Symptom | Layer |
 * |---------|-------|
 * | France–Sweden "Game over" during 2H | Normalize (`post`→full_time) + Lock (frozen row) + Refresh (SSE stopped polling) |
 * | Live score stuck after first goal | Lock (`locked` on live score blocked ESPN merge) |
 * | Bracket shows stale FT score while ESPN live | Identity (M77 vs M78) + Lock + Presentation (locked beats live) |
 * | Duplicate live rows (espn id + M##) | Identity / registry dedupe |
 * | Kickoff conflict banner vs live clock | Schedule vs ESPN kickoff + materialized display merge |
 * | Consensus never updates score | Link (ambiguous vote target) + Lock |
 *
 * Authorities:
 * 1. Lifecycle (status, period, clock): ESPN scoreboard only
 * 2. Identity (official M##): fixture registry + static schedule
 * 3. Scores (optional): secondary sources, score fields only, skip if link ambiguous
 * 4. `locked`: result final (`completed` + locked) — never "has a score"
 * 5. Polling: always during active live windows, regardless of SSE heartbeats
 */

export const LIVE_DATA_CONTRACT = {
  /** WC Live API score votes — off until identity + lock fixes are stable. */
  enableWcLiveScoreVotes: false,
  enableSportApiScoreVotes: false,
  enableFifaPublicScoreVotes: false,
} as const;

/** True when the match result is official and must not be overwritten by feeds. */
export function isResultFinalLocked(match: MergedMatch | undefined): boolean {
  if (!match) return false;
  if (match.source === "manual") return true;
  return match.status === "completed" && match.locked === true;
}

/** Strip legacy rows where `locked` was set on in-play scores. */
export function sanitizeLegacyLockedFlag(match: MergedMatch): MergedMatch {
  if (match.locked && match.status !== "completed") {
    return { ...match, locked: false };
  }
  return match;
}

/** ESPN sets locked only when the feed marks the result final. */
export function lockedFromEspnStatus(status: MergedMatch["status"], completedFlag?: boolean): boolean {
  return status === "completed" || completedFlag === true;
}

export function shouldRunLivePolling(liveMatches: MergedMatch[]): boolean {
  return liveMatches.some((m) => isMergedMatchInActivePhase(m));
}
