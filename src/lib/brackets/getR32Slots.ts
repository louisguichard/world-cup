import { thirdPlaceMap } from "../../data/thirdPlaceMap";
import type { GroupLetter, GroupStanding, Team, TeamRecord } from "../../types";
import {
  rankAliveBestThirds,
  type QualificationMatchContext,
} from "../thirdPlaceQualification";

/** Official FIFA WC 2026 Round of 32 fixture pairing table. */
export const ROUND_OF_32_FIXTURES = [
  ["M73", "2A", "2B"],
  ["M74", "1E", "3:1E"],
  ["M75", "1F", "2C"],
  ["M76", "1C", "2F"],
  ["M77", "1I", "3:1I"],
  ["M78", "2E", "2I"],
  ["M79", "1A", "3:1A"],
  ["M80", "1L", "3:1L"],
  ["M81", "1D", "3:1D"],
  ["M82", "1G", "3:1G"],
  ["M83", "2K", "2L"],
  ["M84", "1H", "2J"],
  ["M85", "1B", "3:1B"],
  ["M86", "1J", "2H"],
  ["M87", "1K", "3:1K"],
  ["M88", "2D", "2G"],
] as const;

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
  thirdMapping: Record<string, string>,
  qualifiedThirdTeamIds: Set<string>
): string | undefined {
  if (seed.startsWith("3:")) {
    const group = thirdMapping[seed.slice(2)] as GroupLetter | undefined;
    if (!group) return undefined;
    const thirdId = standingsByGroup[group]?.[2]?.teamId;
    return thirdId && qualifiedThirdTeamIds.has(thirdId) ? thirdId : undefined;
  }

  const rank = Number(seed[0]) - 1;
  const group = seed[1] as GroupLetter;
  return standingsByGroup[group]?.[rank]?.teamId;
}

function seedLabel(seed: string, thirdMapping: Record<string, string>): string {
  if (seed.startsWith("3:")) {
    const group = thirdMapping[seed.slice(2)];
    return group ? `3${group}` : "3?";
  }

  return seed;
}

type TeamsById = Record<string, Team>;

/**
 * Returns the authoritative 32 bracket slots using the official
 * FIFA WC 2026 bracket structure.
 * Uses live group results when available; third-place slots stay TBD until mapped.
 */
export function getR32Slots(
  standings: GroupStanding[],
  teamsById: TeamsById,
  qualContext: QualificationMatchContext = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }
): R32Slot[] {
  const standingsByGroup = Object.fromEntries(
    standings.map((standing) => [standing.group, standing.rows])
  ) as Record<GroupLetter, TeamRecord[]>;

  const aliveBestThirds = rankAliveBestThirds(standings, qualContext);
  const qualifiedThirdTeamIds = new Set(aliveBestThirds.slice(0, 8).map((record) => record.teamId));
  const qualifiedThirdGroups = aliveBestThirds
    .slice(0, 8)
    .map((record) => record.group)
    .sort()
    .join("");
  const thirdMapping = thirdPlaceMap[qualifiedThirdGroups] ?? {};

  return ROUND_OF_32_FIXTURES.map(([matchId, homeSeed, awaySeed]) => {
    const homeTeamId = seedToTeamId(homeSeed, standingsByGroup, thirdMapping, qualifiedThirdTeamIds);
    const awayTeamId = seedToTeamId(awaySeed, standingsByGroup, thirdMapping, qualifiedThirdTeamIds);
    const homeSource = seedLabel(homeSeed, thirdMapping);
    const awaySource = seedLabel(awaySeed, thirdMapping);

    return {
      matchId,
      homeTeamId,
      awayTeamId,
      homeTeam: homeTeamId ? (teamsById[homeTeamId] ?? null) : null,
      awayTeam: awayTeamId ? (teamsById[awayTeamId] ?? null) : null,
      homeSource,
      awaySource,
    };
  });
}
