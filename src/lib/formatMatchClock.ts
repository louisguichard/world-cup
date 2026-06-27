import type { MatchPeriod, MatchStatus } from "../types";
import type { MergedMatch } from "../types";
import { APP_COPY } from "./appCopy";

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

/** Running match clock for live UI — returns Final for completed matches. */
export function formatLiveClock(match: ClockFields): string {
  if (match.status === "completed" || match.period === "full_time") {
    return APP_COPY.match.final;
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
    return APP_COPY.match.fullTime;
  }

  switch (period) {
    case "first_half":
      return APP_COPY.match.firstHalf;
    case "second_half":
      return APP_COPY.match.secondHalf;
    case "half_time":
      return APP_COPY.match.halftime;
    case "extra_time_first":
      return APP_COPY.match.extraTimeFirst;
    case "extra_time_second":
      return APP_COPY.match.extraTimeSecond;
    case "penalties":
      return APP_COPY.match.penalties;
    case "not_started":
      return null;
    case "extra_time_break":
      return APP_COPY.match.extraTimeBreak;
    case "postponed":
      return APP_COPY.match.postponed;
    case "interrupted":
      return APP_COPY.match.interrupted;
    default:
      if (period === undefined) return null;
      return null;
  }
}
