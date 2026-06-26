import type { MatchPeriod, MatchStatus } from "../types";
import type { MergedMatch } from "../types";

type ClockFields = Pick<
  MergedMatch,
  "status" | "period" | "displayClock" | "clockMinute" | "clockExtra"
>;

function normalizeDisplayClock(displayClock: string): string {
  const trimmed = displayClock.trim();
  const parsed = trimmed.match(/^(\d+)(?:[''])?(?:\+(\d+))?/);
  if (parsed) {
    if (parsed[2]) return `${parsed[1]}+${parsed[2]}'`;
    return `${parsed[1]}'`;
  }
  return trimmed.endsWith("'") ? trimmed : `${trimmed}'`;
}

/** Running match clock for live UI — returns FT for completed matches. */
export function formatLiveClock(match: ClockFields): string {
  if (match.status === "completed" || match.period === "full_time") {
    return "FT";
  }

  if (match.displayClock) {
    return normalizeDisplayClock(match.displayClock);
  }

  if (match.clockMinute !== undefined) {
    if (match.clockExtra) {
      return `${match.clockMinute}+${match.clockExtra}'`;
    }
    return `${match.clockMinute}'`;
  }

  // Live match with no clock data yet — show opening minute
  if (match.status === "live") {
    return "0'";
  }

  return "";
}

/** Human-readable period label for live matches. */
export function formatPeriodLabel(
  period?: MatchPeriod,
  status?: MatchStatus
): string | null {
  if (status === "completed" || period === "full_time") {
    return "Full Time";
  }

  switch (period) {
    case "first_half":
      return "1st Half";
    case "second_half":
      return "2nd Half";
    case "half_time":
      return "Half Time";
    case "extra_time_first":
      return "ET 1st";
    case "extra_time_second":
      return "ET 2nd";
    case "penalties":
      return "Penalties";
    case "not_started":
      return null;
    case "extra_time_break":
      return "ET Break";
    case "postponed":
      return "Postponed";
    case "interrupted":
      return "Interrupted";
    default:
      if (period === undefined) return null;
      return null;
  }
}
