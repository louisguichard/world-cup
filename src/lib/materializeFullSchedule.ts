import { resolveTeamFromStore } from "../data/wc2026TeamCatalog";
import { isBracketPlaceholderTeamId } from "./brackets/isBracketPlaceholderTeamId";
import type { KnockoutParticipant } from "./brackets/resolveKnockoutParticipants";
import { resolveKnockoutParticipants } from "./brackets/resolveKnockoutParticipants";
import { sanitizeKnockoutTeamPair } from "./brackets/sanitizeKnockoutParticipant";
import { prepareLiveMatchStore } from "./liveMatchStorePipeline";
import { getAllScheduleEntries } from "../services/BroadcastLookup";
import { pairKey } from "./normalize";
import type { GroupStanding, MergedMatch, Team, GroupLetter } from "../types";

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

/** Fill empty knockout sides from standings-derived participants (live overlay may omit team ids). */
export function applyKnockoutTeamIds(
  match: MergedMatch,
  matchId: string,
  knockout: KnockoutParticipant | undefined
): MergedMatch {
  if (!knockout) return match;
  const homeTeamId = isBracketPlaceholderTeamId(match.homeTeamId)
    ? knockout.home.teamId || ""
    : match.homeTeamId || knockout.home.teamId || "";
  const awayTeamId = isBracketPlaceholderTeamId(match.awayTeamId)
    ? knockout.away.teamId || ""
    : match.awayTeamId || knockout.away.teamId || "";
  const sanitized = sanitizeKnockoutTeamPair(homeTeamId, awayTeamId);
  return {
    ...match,
    matchId: match.matchId ?? matchId,
    homeTeamId: sanitized.homeTeamId,
    awayTeamId: sanitized.awayTeamId,
  };
}

/**
 * Materialize all 104 schedule entries as MergedMatch shells, then overlay any
 * liveMatches entry matched by matchId, espnEventId, or pairKey.
 *
 * Returns matches sorted by date ascending.
 */
export function materializeFullSchedule(
  teams: Record<string, Team>,
  liveMatches: Record<string, MergedMatch>,
  groupStandings: GroupStanding[] = []
): MergedMatch[] {
  const entries = getAllScheduleEntries();
  const nameIndex = buildNameIndex(teams);
  const preparedStore = prepareLiveMatchStore(liveMatches, teams);
  const knockoutParticipants =
    groupStandings.length > 0
      ? resolveKnockoutParticipants(groupStandings, teams, preparedStore)
      : {};

  // Index live matches by matchId, espnEventId, and pairKey for overlay
  const liveByMatchId: Record<string, MergedMatch> = {};
  const liveByEspnId: Record<string, MergedMatch> = {};
  const liveByPair: Record<string, MergedMatch> = {};
  for (const m of Object.values(preparedStore)) {
    if (m.matchId) liveByMatchId[m.matchId] = m;
    if (m.espnEventId) liveByEspnId[m.espnEventId] = m;
    if (/^\d+$/.test(m.id)) liveByEspnId[m.id] = m;
    const home = resolveTeamFromStore(teams, m.homeTeamId);
    const away = resolveTeamFromStore(teams, m.awayTeamId);
    if (home && away) {
      liveByPair[pairKey(home.name, away.name)] = m;
    }
  }

  const result: MergedMatch[] = [];

  for (const entry of entries) {
    const matchId = `M${entry.matchNumber}`;
    const knockout = knockoutParticipants[matchId];
    let homeTeamId = nameIndex[entry.homeTeam.toLowerCase()] ?? knockout?.home.teamId ?? "";
    let awayTeamId = nameIndex[entry.awayTeam.toLowerCase()] ?? knockout?.away.teamId ?? "";

    // Check if a live overlay exists
    const pair = pairKey(entry.homeTeam, entry.awayTeam);
    const scheduleVenue = `${entry.venue.name}, ${entry.venue.city}`;
    const live =
      liveByMatchId[matchId] ??
      (entry.espnEventId ? liveByEspnId[entry.espnEventId] : undefined) ??
      liveByPair[pair];

    if (live) {
      result.push(
        applyKnockoutTeamIds(
          {
            ...live,
            matchId,
            venue: live.venue ?? scheduleVenue,
          },
          matchId,
          knockout
        )
      );
      continue;
    }

    // Build static shell
    const groupLetter = entry.group as GroupLetter | undefined;
    const isKnockout = !groupLetter && entry.stage !== "Group Stage";

    result.push(
      applyKnockoutTeamIds(
        {
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
          venue: scheduleVenue,
          stage: isKnockout
            ? (entry.stage as import("../types").Stage | undefined)
            : undefined,
        },
        matchId,
        knockout
      )
    );
  }

  return result.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
