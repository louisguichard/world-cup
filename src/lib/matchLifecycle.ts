import { isKnockoutMatch } from "./resolveMatchWinner";
import type { GroupLetter, Stage } from "../types";
import {
  GROUP_MAX_PLAYING_MINUTES,
  KNOCKOUT_MAX_PLAYING_MINUTES_WITH_BUFFER,
  REGULATION_MINUTES,
} from "./tournamentRules";

export type MatchPhase =
  | "dormant"
  | "imminent"
  | "live_first"
  | "halftime"
  | "live_second"
  | "extra_time"
  | "post_match"
  | "locked";

export type MatchPhaseInput = {
  kickoffMs?: number;
  date?: string;
  status: string;
  clockMinute?: number;
  locked?: boolean;
  group?: GroupLetter;
  stage?: Stage;
  matchId?: string;
  id?: string;
  period?: string;
};

const IMMINENT_MS = 15 * 60 * 1000;
const POST_MATCH_WINDOW_MS = 45 * 60 * 1000;

/** Upstream feeds may flip to "live" before kickoff; ignore until within this window. */
export const PRE_KICKOFF_LIVE_TOLERANCE_MS = 2 * 60 * 1000;

export function resolveMatchKickoffMs(match: { kickoffMs?: number; date?: string }): number | undefined {
  if (match.kickoffMs != null && !Number.isNaN(match.kickoffMs)) return match.kickoffMs;
  if (!match.date) return undefined;
  const parsed = Date.parse(match.date);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function isActiveLivePhase(phase: MatchPhase): boolean {
  return (
    phase === "live_first" ||
    phase === "halftime" ||
    phase === "live_second" ||
    phase === "extra_time"
  );
}

/** True when a match should appear in the live-now surface (includes imminent and brief post-match). */
export function isActivePhase(phase: MatchPhase): boolean {
  return (
    isActiveLivePhase(phase) ||
    phase === "imminent" ||
    phase === "post_match"
  );
}

function isInPlayFeedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s === "live" ||
    s === "halftime" ||
    s === "half_time" ||
    s === "paused" ||
    s === "delayed" ||
    s === "interrupted" ||
    s === "inprogress" ||
    s === "in"
  );
}

function liveClockPhase(match: MatchPhaseInput): MatchPhase {
  const min = match.clockMinute ?? 0;
  const knockout = matchAllowsExtraTime(match);
  if (knockout && min >= REGULATION_MINUTES) return "extra_time";
  if (min >= REGULATION_MINUTES / 2 + 1) return "live_second";
  if (min >= REGULATION_MINUTES / 2 - 1 && min <= REGULATION_MINUTES / 2 + 1) return "halftime";
  return "live_first";
}

/** True when a match should render as live — rejects premature upstream "live" before kickoff. */
export function isMatchEffectivelyLive(match: MatchPhaseInput, nowMs = Date.now()): boolean {
  if (match.status !== "live" || match.locked) return false;
  return isActiveLivePhase(getMatchPhase(match, nowMs));
}

export function isMergedMatchEffectivelyLive(
  match: MatchPhaseInput & { kickoffMs?: number; date?: string },
  nowMs = Date.now()
): boolean {
  const kickoffMs = match.kickoffMs ?? resolveMatchKickoffMs(match);
  if (kickoffMs == null) return isInPlayFeedStatus(match.status) && !match.locked;
  return isMatchEffectivelyLive({ ...match, kickoffMs }, nowMs);
}

/** Broad live-now visibility — uses lifecycle phase, not raw status === "live". */
export function isMergedMatchInActivePhase(
  match: MatchPhaseInput & { kickoffMs?: number; date?: string; locked?: boolean },
  nowMs = Date.now()
): boolean {
  const kickoffMs = match.kickoffMs ?? resolveMatchKickoffMs(match);
  const inPlay = isInPlayFeedStatus(match.status);

  // Finalized only — in-play matches stay visible even if a stale `locked` flag was set.
  if (match.locked && !inPlay) {
    if (match.status !== "completed") return false;
  }

  if (kickoffMs == null) {
    return inPlay;
  }
  return isActivePhase(getMatchPhase({ ...match, kickoffMs }, nowMs));
}

type LiveClockFields = {
  clockMinute?: number;
  clockExtra?: number;
  clockRunning?: boolean;
  displayClock?: string;
  period?: string;
};

/** Reject persisted `live` when kickoff has not arrived — applies to every data source. */
export function coerceLiveStatusForKickoff<T extends MatchPhaseInput & LiveClockFields>(
  match: T,
  nowMs = Date.now()
): T {
  const kickoffMs = match.kickoffMs ?? resolveMatchKickoffMs(match);
  if (match.status !== "live" || kickoffMs == null) return match;
  if (isMatchEffectivelyLive({ ...match, kickoffMs }, nowMs)) return match;
  return {
    ...match,
    kickoffMs,
    status: "scheduled",
    clockMinute: undefined,
    clockExtra: undefined,
    clockRunning: undefined,
    displayClock: undefined,
    period: undefined,
  };
}

function matchAllowsExtraTime(match: MatchPhaseInput): boolean {
  return isKnockoutMatch({
    matchId: match.matchId,
    id: match.id ?? match.matchId ?? "",
    group: match.group,
    stage: match.stage,
  });
}

function estimatedMaxDurationMinutes(match: MatchPhaseInput): number {
  return matchAllowsExtraTime(match)
    ? KNOCKOUT_MAX_PLAYING_MINUTES_WITH_BUFFER
    : GROUP_MAX_PLAYING_MINUTES;
}

export function getMatchPhase(match: MatchPhaseInput, nowMs = Date.now()): MatchPhase {
  const status = match.status.toLowerCase();
  if (status === "locked") return "locked";

  const inPlay = isInPlayFeedStatus(match.status);
  if (match.locked && !inPlay && match.status !== "completed") return "locked";

  const kickoffMs = match.kickoffMs ?? (match.date ? Date.parse(match.date) : NaN);
  if (!Number.isFinite(kickoffMs)) return "dormant";

  if (status === "postponed" || status === "cancelled") return "dormant";

  const msUntilKickoff = kickoffMs - nowMs;

  if (match.status === "completed") {
    const estimatedEndMs = kickoffMs + estimatedMaxDurationMinutes(match) * 60 * 1000;
    if (nowMs - estimatedEndMs < POST_MATCH_WINDOW_MS) return "post_match";
    return "locked";
  }

  if (match.period === "half_time" || status === "halftime" || status === "half_time") {
    return "halftime";
  }

  if (match.status === "live" && msUntilKickoff > PRE_KICKOFF_LIVE_TOLERANCE_MS) {
    if (msUntilKickoff <= IMMINENT_MS) return "imminent";
    return "dormant";
  }

  if (isInPlayFeedStatus(match.status)) {
    return liveClockPhase(match);
  }

  if (msUntilKickoff <= IMMINENT_MS && msUntilKickoff > 0) return "imminent";
  if (msUntilKickoff <= 0) {
    return match.status === "scheduled" || status === "delayed" ? "imminent" : liveClockPhase(match);
  }

  return "dormant";
}

export function getPhaseInterval(phase: MatchPhase): number {
  switch (phase) {
    case "dormant":
      return Infinity;
    case "imminent":
      return 60_000;
    case "live_first":
      return 15_000;
    case "halftime":
      return 60_000;
    case "live_second":
      return 15_000;
    case "extra_time":
      return 10_000;
    case "post_match":
      return 120_000;
    case "locked":
      return Infinity;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}
