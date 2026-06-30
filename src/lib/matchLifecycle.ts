export type MatchPhase =
  | "dormant"
  | "imminent"
  | "live_first"
  | "halftime"
  | "live_second"
  | "extra_time"
  | "post_match"
  | "locked";

const IMMINENT_MS = 15 * 60 * 1000;
const POST_MATCH_WINDOW_MS = 45 * 60 * 1000;

export function getMatchPhase(
  match: {
    kickoffMs: number;
    status: string;
    clockMinute?: number;
    locked?: boolean;
  },
  nowMs = Date.now()
): MatchPhase {
  if (match.locked || match.status === "locked") return "locked";

  if (match.status === "completed") {
    const estimatedEndMs = match.kickoffMs + 115 * 60 * 1000;
    if (nowMs - estimatedEndMs < POST_MATCH_WINDOW_MS) return "post_match";
    return "locked";
  }

  if (match.status === "live") {
    const min = match.clockMinute ?? 0;
    if (min >= 90) return "extra_time";
    if (min >= 46) return "live_second";
    if (min >= 44 && min <= 46) return "halftime";
    return "live_first";
  }

  const msUntilKickoff = match.kickoffMs - nowMs;
  if (msUntilKickoff <= IMMINENT_MS && msUntilKickoff > 0) return "imminent";
  if (msUntilKickoff <= 0) return "live_first";

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
