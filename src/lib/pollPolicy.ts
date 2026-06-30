import type { MergedMatch } from "../types";
import { getMatchPhase, getPhaseInterval, type MatchPhase } from "./matchLifecycle";

export const POLL_LIVE_MS = 15_000;
export const POLL_IDLE_MS = 300_000;
export const POLL_THIRD_PLACE_LIVE_MS = 15_000;

/** Legacy shim — kept for callers not yet on the match-aware API */
export function pollIntervalMs(hasLiveMatches: boolean): number {
  return hasLiveMatches ? POLL_LIVE_MS : POLL_IDLE_MS;
}

export function isLightPoll(hasLiveMatches: boolean): boolean {
  return !hasLiveMatches;
}

function resolveKickoffMs(match: MergedMatch): number | undefined {
  if (match.kickoffMs != null && !Number.isNaN(match.kickoffMs)) return match.kickoffMs;
  if (!match.date) return undefined;
  const parsed = Date.parse(match.date);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Compute the optimal next poll interval in ms by examining every active match.
 * Returns the MINIMUM interval across all non-dormant, non-locked matches.
 * Returns POLL_IDLE_MS (300s) if there is nothing to watch.
 */
export function smartPollIntervalMs(
  matches: MergedMatch[],
  nowMs = Date.now()
): { intervalMs: number; reason: string; phase: MatchPhase | "idle" } {
  let minInterval = POLL_IDLE_MS;
  let dominantPhase: MatchPhase | "idle" = "idle";

  for (const match of matches) {
    const kickoffMs = resolveKickoffMs(match);
    if (kickoffMs == null) continue;
    const phase = getMatchPhase(
      {
        kickoffMs,
        status: match.status,
        clockMinute: match.clockMinute,
        locked: match.locked,
      },
      nowMs
    );
    const interval = getPhaseInterval(phase);
    if (interval < minInterval) {
      minInterval = interval;
      dominantPhase = phase;
    }
  }

  const reason =
    dominantPhase === "idle"
      ? "No active matches — resting"
      : `Driven by phase: ${dominantPhase}`;

  return { intervalMs: minInterval, reason, phase: dominantPhase };
}

/**
 * Returns true if the current match set warrants a full (heavy) poll.
 * Heavy = multi-source consensus. Light = ESPN only.
 */
export function shouldRunHeavyPoll(matches: MergedMatch[], nowMs = Date.now()): boolean {
  return matches.some((m) => {
    const kickoffMs = resolveKickoffMs(m);
    if (kickoffMs == null) return false;
    const phase = getMatchPhase(
      {
        kickoffMs,
        status: m.status,
        clockMinute: m.clockMinute,
        locked: m.locked,
      },
      nowMs
    );
    return phase === "live_first" || phase === "live_second" || phase === "extra_time";
  });
}
