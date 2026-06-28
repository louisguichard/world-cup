import type { MergedMatch, Team } from "../types";
import { canonicalizeMatchTeamIds } from "../services/espnMatchMerge";
import { enrichMatchWithScheduleId, resolveOfficialMatchKickoff } from "../services/ScheduleLinker";

export function normalizeLiveMatchRecord(
  match: MergedMatch,
  teams: Record<string, Team>
): MergedMatch {
  const canonical = canonicalizeMatchTeamIds(match, teams);
  const linked = enrichMatchWithScheduleId(canonical, teams);
  return {
    ...linked,
    date: resolveOfficialMatchKickoff(linked),
  };
}

export function normalizeLiveMatchStore(
  matches: Record<string, MergedMatch>,
  teams: Record<string, Team>
): Record<string, MergedMatch> {
  const out: Record<string, MergedMatch> = {};
  for (const [key, match] of Object.entries(matches)) {
    out[key] = normalizeLiveMatchRecord(match, teams);
  }
  return out;
}
