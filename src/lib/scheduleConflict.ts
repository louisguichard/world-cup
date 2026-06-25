import { normalizeKickoffUtc } from "./normalize";
import { getBroadcast } from "../services/BroadcastLookup";
import { formatKickoffLocal } from "../services/ScheduleLinker";
import type { MergedMatch } from "../types";

const CONFLICT_THRESHOLD_MS = 15 * 60 * 1000;

export type ScheduleConflict = {
  scheduleKickoffUtc: string;
  liveKickoffUtc: string;
  scheduleLabel: string;
  liveLabel: string;
};

export function detectKickoffConflict(match: MergedMatch): ScheduleConflict | null {
  if (!match.date) return null;

  const broadcast = match.matchId ? getBroadcast(match.matchId) : undefined;
  const scheduleUtc = broadcast?.kickoffUTC;
  if (!scheduleUtc) return null;

  const scheduleMs = Date.parse(normalizeKickoffUtc(scheduleUtc));
  const liveMs = Date.parse(normalizeKickoffUtc(match.date));
  if (!Number.isFinite(scheduleMs) || !Number.isFinite(liveMs)) return null;

  if (Math.abs(scheduleMs - liveMs) < CONFLICT_THRESHOLD_MS) return null;

  return {
    scheduleKickoffUtc: scheduleUtc,
    liveKickoffUtc: match.date,
    scheduleLabel: formatKickoffLocal(scheduleUtc),
    liveLabel: formatKickoffLocal(match.date)
  };
}
