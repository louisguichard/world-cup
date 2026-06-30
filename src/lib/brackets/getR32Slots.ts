import type { GroupLetter, GroupStanding, Team, TeamRecord } from "../../types";
import {
  logTournamentRuleViolation,
  validateThirdPlaceAntiRematch,
} from "../tournamentValidation";
import {
  rankAliveBestThirds,
  type QualificationMatchContext,
} from "../thirdPlaceQualification";

/**
 * SOLE SOURCE OF TRUTH — FIFA World Cup 2026 Round of 32 fixture pairings.
 * Derived from `world_cup_2026_knockout_bracket.json`. All code reads from here.
 * No runtime API, scraper, or inference may override these matchups.
 *
 * Seeds: "1X" = group winner, "2X" = runner-up, "3X" = best third from group X.
 */
export const ROUND_OF_32_FIXTURES = [
  ["M73", "1A", "3E"],
  ["M74", "1B", "3J"],
  ["M75", "1D", "3B"],
  ["M76", "1E", "3D"],
  ["M77", "1G", "3I"],
  ["M78", "1I", "3F"],
  ["M79", "1K", "3L"],
  ["M80", "1L", "3K"],
  ["M81", "2A", "2B"],
  ["M82", "2D", "2G"],
  ["M83", "2K", "2L"],
  ["M84", "1H", "2J"],
  ["M85", "1C", "2F"],
  ["M86", "1F", "3C"],
  ["M87", "1J", "3H"],
  ["M88", "2E", "2I"],
] as const;

Object.freeze(ROUND_OF_32_FIXTURES);

const fixtureAntiRematchViolation = validateThirdPlaceAntiRematch(ROUND_OF_32_FIXTURES);
if (fixtureAntiRematchViolation) {
  logTournamentRuleViolation(fixtureAntiRematchViolation, "getR32Slots");
}

export type R32Slot = {
  matchId: string;
  homeTeamId: string | undefined;
  awayTeamId: string | undefined;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeSource: string;
  awaySource: string;
};

function seedToTeamId(
  seed: string,
  standingsByGroup: Record<GroupLetter, TeamRecord[]>,
  qualifiedThirdTeamIds: Set<string>
): string | undefined {
  const rank = Number(seed[0]) - 1;
  const group = seed[1] as GroupLetter;
  const teamId = standingsByGroup[group]?.[rank]?.teamId;
  if (rank === 2) {
    return teamId && qualifiedThirdTeamIds.has(teamId) ? teamId : undefined;
  }
  return teamId;
}

type TeamsById = Record<string, Team>;

/**
 * Returns the authoritative 16 R32 bracket slots using the official
 * FIFA WC 2026 bracket structure. Slot order and seed assignments are immutable.
 */
export function getR32Slots(
  standings: GroupStanding[],
  teamsById: TeamsById,
  qualContext: QualificationMatchContext = {
    lockedGroupMatchCount: {},
    lockedStandingsByGroup: {},
  }
): R32Slot[] {
  const standingsByGroup = Object.fromEntries(
    standings.map((s) => [s.group, s.rows])
  ) as Record<GroupLetter, TeamRecord[]>;

  const aliveBestThirds = rankAliveBestThirds(standings, qualContext);
  const qualifiedThirdTeamIds = new Set(aliveBestThirds.slice(0, 8).map((r) => r.teamId));

  return ROUND_OF_32_FIXTURES.map(([matchId, homeSeed, awaySeed]) => {
    const homeTeamId = seedToTeamId(homeSeed, standingsByGroup, qualifiedThirdTeamIds);
    const awayTeamId = seedToTeamId(awaySeed, standingsByGroup, qualifiedThirdTeamIds);

    return {
      matchId,
      homeTeamId,
      awayTeamId,
      homeTeam: homeTeamId ? (teamsById[homeTeamId] ?? null) : null,
      awayTeam: awayTeamId ? (teamsById[awayTeamId] ?? null) : null,
      homeSource: homeSeed,
      awaySource: awaySeed,
    };
  });
}
