import { knockoutSchedule } from "../../data/knockoutSchedule";
import type { GroupLetter, GroupStanding, MergedMatch, Team } from "../../types";
import { isKnockoutBracketMatchId } from "../bracketTree";
import { buildFixtureRegistry } from "../registry/buildFixtureRegistry";
import { isThirdPlaceSeed } from "./bracketProgression";
import { ROUND_OF_32_FIXTURES } from "./getR32Slots";
import { LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID } from "./scheduleKnockoutCrosswalk";

const fixtureRegistry = buildFixtureRegistry();

function teamPairKey(homeTeamId: string, awayTeamId: string): string {
  return [homeTeamId, awayTeamId].sort().join("|");
}

function teamsMatchFixturePair(
  match: MergedMatch,
  homeTeamId: string,
  awayTeamId: string
): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return false;
  return teamPairKey(match.homeTeamId, match.awayTeamId) === teamPairKey(homeTeamId, awayTeamId);
}

/** ESPN event id + official schedule row beat seed guessing for locked results. */
function resolveAuthoritativeOfficialSlot(match: MergedMatch): string | undefined {
  const espnId =
    match.espnEventId ?? (/^\d+$/.test(String(match.id ?? "")) ? match.id : undefined);
  if (espnId) {
    const officialId = fixtureRegistry.byEspnEventId.get(espnId);
    if (officialId && isKnockoutBracketMatchId(officialId)) {
      const fixture = fixtureRegistry.byMatchId.get(officialId);
      if (
        fixture &&
        teamsMatchFixturePair(match, fixture.homeTeamId, fixture.awayTeamId)
      ) {
        return officialId;
      }
    }
  }

  const stored = match.matchId ?? match.id;
  if (
    match.locked &&
    match.status === "completed" &&
    stored &&
    isKnockoutBracketMatchId(stored)
  ) {
    const fixture = fixtureRegistry.byMatchId.get(stored);
    if (
      fixture &&
      teamsMatchFixturePair(match, fixture.homeTeamId, fixture.awayTeamId)
    ) {
      return stored;
    }
  }

  return undefined;
}

function isLegacyBracketStoreId(storedId: string): boolean {
  const remapped = LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID[storedId];
  return Boolean(remapped && remapped !== storedId);
}

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

export function liveMatchFitsR32Slot(
  match: MergedMatch,
  homeSeed: string,
  awaySeed: string,
  slotStandings: GroupStanding[],
  _teamsById: TeamsById
): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return false;
  return teamsMatchFixtureSeeds(
    match.homeTeamId,
    match.awayTeamId,
    homeSeed,
    awaySeed,
    slotStandings
  );
}

function storedIdMatchesFixtureSeeds(
  storedId: string,
  match: MergedMatch,
  slotStandings: GroupStanding[]
): boolean {
  if (!match.homeTeamId || !match.awayTeamId) return true;
  const fixture = ROUND_OF_32_FIXTURES.find(([matchId]) => matchId === storedId);
  if (!fixture) return true;
  const [, homeSeed, awaySeed] = fixture;
  return teamsMatchFixtureSeeds(
    match.homeTeamId,
    match.awayTeamId,
    homeSeed,
    awaySeed,
    slotStandings
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

function resolveStoredKnockoutId(
  match: MergedMatch,
  storedId: string,
  slotStandings: GroupStanding[]
): string | undefined {
  const idsToTry = [storedId, match.matchId].filter(
    (id): id is string => Boolean(id && isKnockoutBracketMatchId(id))
  );

  for (const id of idsToTry) {
    if (storedIdMatchesFixtureSeeds(id, match, slotStandings)) {
      return id;
    }
  }

  // Legacy bracket cache keys only — never remap FIFA schedule ids that ESPN/fixture already bind.
  for (const id of idsToTry) {
    if (!isLegacyBracketStoreId(id)) continue;
    const remapped = LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID[id];
    if (!remapped || remapped === id) continue;
    if (storedIdMatchesFixtureSeeds(remapped, match, slotStandings)) {
      return remapped;
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
  const authoritative = resolveAuthoritativeOfficialSlot(match);
  if (authoritative) return authoritative;

  const fromStored = resolveStoredKnockoutId(match, storedId, slotStandings);
  if (fromStored) return fromStored;

  if (match.locked && match.status === "completed") {
    return storedId;
  }

  return (
    findOfficialR32SlotForLiveMatch(match, slotStandings, teamsById) ??
    findSlotByVenue(match) ??
    storedId
  );
}

export function isOfficialKnockoutSlotId(matchId: string): boolean {
  return isKnockoutBracketMatchId(matchId);
}
