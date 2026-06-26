import { getAllScheduleEntries } from "../services/BroadcastLookup";
import { pairKey } from "./normalize";
import type { MergedMatch, Team, GroupLetter } from "../types";

/**
 * Build a name → teamId lookup from the teams map.
 * Checks team.name, team.shortName, and team.abbreviation (all normalized).
 */
function buildNameIndex(teams: Record<string, Team>): Record<string, string> {
  const index: Record<string, string> = {};
  for (const team of Object.values(teams)) {
    index[team.name.toLowerCase()] = team.id;
    index[team.shortName.toLowerCase()] = team.id;
    index[team.abbreviation.toLowerCase()] = team.id;
  }
  return index;
}

/**
 * Materialize all 104 schedule entries as MergedMatch shells, then overlay any
 * liveMatches entry matched by matchId, espnEventId, or pairKey.
 *
 * Returns matches sorted by date ascending.
 */
export function materializeFullSchedule(
  teams: Record<string, Team>,
  liveMatches: Record<string, MergedMatch>
): MergedMatch[] {
  const entries = getAllScheduleEntries();
  const nameIndex = buildNameIndex(teams);

  // Index live matches by matchId and by pairKey for overlay
  const liveByMatchId: Record<string, MergedMatch> = {};
  const liveByPair: Record<string, MergedMatch> = {};
  for (const m of Object.values(liveMatches)) {
    if (m.matchId) liveByMatchId[m.matchId] = m;
    const home = teams[m.homeTeamId];
    const away = teams[m.awayTeamId];
    if (home && away) {
      liveByPair[pairKey(home.name, away.name)] = m;
    }
  }

  const result: MergedMatch[] = [];

  for (const entry of entries) {
    const matchId = `M${entry.matchNumber}`;
    const homeTeamId = nameIndex[entry.homeTeam.toLowerCase()] ?? "";
    const awayTeamId = nameIndex[entry.awayTeam.toLowerCase()] ?? "";

    // Check if a live overlay exists
    const pair = pairKey(entry.homeTeam, entry.awayTeam);
    const live =
      liveByMatchId[matchId] ??
      liveByPair[pair];

    if (live) {
      result.push({ ...live, matchId: live.matchId ?? matchId });
      continue;
    }

    // Build static shell
    const groupLetter = entry.group as GroupLetter | undefined;
    const isKnockout = !groupLetter && entry.stage !== "Group Stage";

    result.push({
      id: matchId,
      matchId,
      date: entry.kickoff.utc,
      homeTeamId,
      awayTeamId,
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
      group: groupLetter,
      venue: `${entry.venue.name}, ${entry.venue.city}`,
      stage: isKnockout
        ? (entry.stage as import("../types").Stage | undefined)
        : undefined
    });
  }

  return result.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
