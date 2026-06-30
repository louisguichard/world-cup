import { knockoutSchedule } from "../../data/knockoutSchedule";
import type { GroupLetter, GroupStanding, MergedMatch, Team } from "../../types";
import { isKnockoutBracketMatchId } from "../bracketTree";
import { isThirdPlaceSeed } from "./bracketProgression";
import { ROUND_OF_32_FIXTURES } from "./getR32Slots";

type TeamsById = Record<string, Team>;

function groupLetterFromSeed(seed: string): GroupLetter | undefined {
  if (seed.startsWith("3:")) return undefined;
  if (isThirdPlaceSeed(seed)) return seed[1] as GroupLetter;
  if (seed.length >= 2) return seed[1] as GroupLetter;
  return undefined;
}

function teamMatchesSeed(
  teamId: string,
  seed: string,
  standings: GroupStanding[]
): boolean {
  if (isThirdPlaceSeed(seed)) {
    const group = groupLetterFromSeed(seed);
    if (!group) return false;
    const rows = standings.find((standing) => standing.group === group)?.rows;
    return rows?.[2]?.teamId === teamId;
  }
  const rank = Number(seed[0]) - 1;
  const group = seed[1] as GroupLetter;
  const rows = standings.find((standing) => standing.group === group)?.rows;
  return rows?.[rank]?.teamId === teamId;
}

function teamsMatchFixtureSeeds(
  homeTeamId: string,
  awayTeamId: string,
  homeSeed: string,
  awaySeed: string,
  standings: GroupStanding[]
): boolean {
  return (
    (teamMatchesSeed(homeTeamId, homeSeed, standings) &&
      teamMatchesSeed(awayTeamId, awaySeed, standings)) ||
    (teamMatchesSeed(homeTeamId, awaySeed, standings) &&
      teamMatchesSeed(awayTeamId, homeSeed, standings))
  );
}

function teamsFitSlotByGroup(
  homeTeamId: string,
  awayTeamId: string,
  homeSeed: string,
  awaySeed: string,
  teamsById: TeamsById
): boolean {
  const homeGroup = groupLetterFromSeed(homeSeed);
  const awayGroup = groupLetterFromSeed(awaySeed);
  if (!homeGroup || !awayGroup) return false;
  const homeTeam = teamsById[homeTeamId];
  const awayTeam = teamsById[awayTeamId];
  if (!homeTeam || !awayTeam) return false;
  return (
    (homeTeam.group === homeGroup && awayTeam.group === awayGroup) ||
    (homeTeam.group === awayGroup && awayTeam.group === homeGroup)
  );
}

export function liveMatchFitsR32Slot(
  match: MergedMatch,
  homeSeed: string,
  awaySeed: string,
  slotStandings: GroupStanding[],
  teamsById: TeamsById
): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return false;
  return (
    teamsMatchFixtureSeeds(match.homeTeamId, match.awayTeamId, homeSeed, awaySeed, slotStandings) ||
    teamsFitSlotByGroup(match.homeTeamId, match.awayTeamId, homeSeed, awaySeed, teamsById)
  );
}

export function findOfficialR32SlotForLiveMatch(
  match: MergedMatch,
  standings: GroupStanding[],
  teamsById: TeamsById
): string | undefined {
  if (!match.homeTeamId || !match.awayTeamId) return undefined;
  for (const [matchId, homeSeed, awaySeed] of ROUND_OF_32_FIXTURES) {
    if (liveMatchFitsR32Slot(match, homeSeed, awaySeed, standings, teamsById)) {
      return matchId;
    }
  }
  return undefined;
}

function findSlotByVenue(match: MergedMatch): string | undefined {
  const venue = (match.venue ?? "").toLowerCase();
  if (!venue) return undefined;

  for (const [matchId, info] of Object.entries(knockoutSchedule)) {
    const num = Number(matchId.replace(/^M/, ""));
    if (!Number.isFinite(num) || num < 73 || num > 88) continue;
    const stadium = info.stadium.toLowerCase();
    const city = info.venueCity.toLowerCase();
    if (venue.includes(stadium) || venue.includes(city) || venue.includes(info.hostCity.toLowerCase())) {
      return matchId;
    }
  }

  return undefined;
}

/** Map ESPN store key / venue to official bracket match id (M73–M104). */
export function resolveOfficialKnockoutSlotId(
  match: MergedMatch,
  storedId: string,
  slotStandings: GroupStanding[],
  teamsById: TeamsById
): string {
  if (isKnockoutBracketMatchId(storedId)) return storedId;
  return (
    findOfficialR32SlotForLiveMatch(match, slotStandings, teamsById) ??
    findSlotByVenue(match) ??
    storedId
  );
}

export function isOfficialKnockoutSlotId(matchId: string): boolean {
  return isKnockoutBracketMatchId(matchId);
}
