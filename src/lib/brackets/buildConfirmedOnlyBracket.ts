import { knockoutSchedule } from "../../data/knockoutSchedule";
import type {
  BracketMatch,
  GroupStanding,
  Match,
  MatchWithScore,
  MergedMatch,
  Stage,
  Team,
} from "../../types";
import { isKnockoutBracketMatchId, lookupBracketLiveMatch, seedLabelToMatchId } from "../bracketTree";
import { materializeFullSchedule } from "../materializeFullSchedule";
import { computeStandings } from "../tournament";
import { computeQualificationStatus, type QualificationMatchContext } from "../qualification";
import { resolveMatchWinner } from "../resolveMatchWinner";
import { getR32Slots, ROUND_OF_32_FIXTURES } from "./getR32Slots";
import type { GroupLetter } from "../../types";
import { KNOCKOUT_ROUND_FIXTURES } from "./knockoutRoundFixtures";

type TeamsById = Record<string, Team>;

function indexKnockoutScheduleMatches(
  teamsById: TeamsById,
  liveMatches: Record<string, MergedMatch>,
  standings: GroupStanding[]
): Map<string, MergedMatch> {
  const byMatchId = new Map<string, MergedMatch>();
  for (const match of materializeFullSchedule(teamsById, liveMatches, standings)) {
    const matchId = match.matchId;
    if (!matchId || !isKnockoutBracketMatchId(matchId)) continue;
    byMatchId.set(matchId, match);
  }
  return byMatchId;
}

function standingsForConfirmedSlots(
  standings: GroupStanding[],
  qualContext: QualificationMatchContext
): GroupStanding[] {
  const locked = qualContext.lockedStandingsByGroup;
  if (!locked || Object.keys(locked).length === 0) return standings;

  return standings.map((standing) => {
    const lockedRows = locked[standing.group];
    return lockedRows?.length ? { ...standing, rows: lockedRows } : standing;
  });
}

function indexLiveKnockoutByPair(
  liveMatches: Record<string, MergedMatch>
): Map<string, MergedMatch> {
  const byPair = new Map<string, MergedMatch>();
  for (const match of Object.values(liveMatches)) {
    if (match.group) continue;
    if (!match.homeTeamId || !match.awayTeamId) continue;
    const key = [match.homeTeamId, match.awayTeamId].sort().join("|");
    byPair.set(key, match);
  }
  return byPair;
}

function lookupScheduleKnockoutMatch(
  scheduleMatches: Map<string, MergedMatch>,
  liveMatches: Record<string, MergedMatch>,
  bracketMatchId: string
): MergedMatch | undefined {
  return scheduleMatches.get(bracketMatchId) ?? lookupBracketLiveMatch(liveMatches, bracketMatchId);
}

function teamMatchesSeed(
  teamId: string,
  seed: string,
  standings: GroupStanding[]
): boolean {
  if (seed.startsWith("3:")) return false;
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
  if (homeSeed.startsWith("3:") || awaySeed.startsWith("3:")) return false;
  const homeTeam = teamsById[homeTeamId];
  const awayTeam = teamsById[awayTeamId];
  if (!homeTeam || !awayTeam) return false;
  const homeGroup = homeSeed[1];
  const awayGroup = awaySeed[1];
  return (
    (homeTeam.group === homeGroup && awayTeam.group === awayGroup) ||
    (homeTeam.group === awayGroup && awayTeam.group === homeGroup)
  );
}

function liveMatchFitsSlot(
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
function findOfficialR32SlotForLiveMatch(
  match: MergedMatch,
  standings: GroupStanding[],
  teamsById: TeamsById
): string | undefined {
  if (!match.homeTeamId || !match.awayTeamId) return undefined;
  for (const [matchId, homeSeed, awaySeed] of ROUND_OF_32_FIXTURES) {
    if (liveMatchFitsSlot(match, homeSeed, awaySeed, standings, teamsById)) {
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

function resolveOfficialKnockoutSlotId(
  match: MergedMatch,
  storedId: string,
  slotStandings: GroupStanding[],
  teamsById: TeamsById
): string {
  return (
    findOfficialR32SlotForLiveMatch(match, slotStandings, teamsById) ??
    findSlotByVenue(match) ??
    storedId
  );
}

function indexLiveByOfficialSlot(
  liveMatches: Record<string, MergedMatch>,
  slotStandings: GroupStanding[],
  teamsById: TeamsById
): Map<string, MergedMatch> {
  const bySlot = new Map<string, MergedMatch>();
  for (const match of Object.values(liveMatches)) {
    if (match.group || !match.homeTeamId || !match.awayTeamId) continue;
    const stored =
      match.matchId && isKnockoutBracketMatchId(match.matchId) ? match.matchId : match.id;
    const officialId = resolveOfficialKnockoutSlotId(
      match,
      isKnockoutBracketMatchId(stored) ? stored : "",
      slotStandings,
      teamsById
    );
    if (!isKnockoutBracketMatchId(officialId)) continue;
    const existing = bySlot.get(officialId);
    const isLocked = match.status === "completed" && match.locked;
    const existingLocked = existing?.status === "completed" && existing?.locked;
    if (!existing || (isLocked && !existingLocked)) {
      bySlot.set(officialId, match);
    }
  }
  return bySlot;
}

function lookupLiveForSlot(
  slot: ReturnType<typeof getR32Slots>[number],
  scheduleMatches: Map<string, MergedMatch>,
  liveByOfficialSlot: Map<string, MergedMatch>,
  liveMatches: Record<string, MergedMatch>,
  liveByPair: Map<string, MergedMatch>,
  slotStandings: GroupStanding[],
  teamsById: TeamsById
): MergedMatch | undefined {
  const officialLive = liveByOfficialSlot.get(slot.matchId);
  if (officialLive) return officialLive;

  const fixture = ROUND_OF_32_FIXTURES.find(([matchId]) => matchId === slot.matchId);

  if (fixture) {
    const [, homeSeed, awaySeed] = fixture;
    for (const match of liveByPair.values()) {
      if (liveMatchFitsSlot(match, homeSeed, awaySeed, slotStandings, teamsById)) {
        return match;
      }
    }
  }

  const scheduled = lookupScheduleKnockoutMatch(scheduleMatches, liveMatches, slot.matchId);
  if (scheduled?.homeTeamId && scheduled?.awayTeamId && fixture) {
    const [, homeSeed, awaySeed] = fixture;
    if (liveMatchFitsSlot(scheduled, homeSeed, awaySeed, slotStandings, teamsById)) {
      return scheduled;
    }
  }

  if (slot.homeTeamId && slot.awayTeamId) {
    const pairKey = [slot.homeTeamId, slot.awayTeamId].sort().join("|");
    const byPair = liveByPair.get(pairKey);
    if (byPair) return byPair;
  }

  return scheduled;
}

function registerConfirmedWinner(
  match: MergedMatch,
  storedId: string,
  slotStandings: GroupStanding[],
  teamsById: TeamsById,
  confirmedWinners: Map<string, string>
): void {
  if (match.status !== "completed" || !match.locked) return;
  const winner = resolveMatchWinner(match, teamsById);
  if (!winner) return;
  const officialId = resolveOfficialKnockoutSlotId(match, storedId, slotStandings, teamsById);
  confirmedWinners.set(officialId, winner);
}

function indexConfirmedWinners(
  scheduleMatches: Map<string, MergedMatch>,
  liveMatches: Record<string, MergedMatch>,
  teamsById: TeamsById,
  slotStandings: GroupStanding[]
): Map<string, string> {
  const confirmedWinners = new Map<string, string>();
  const seen = new Set<string>();

  for (const [matchId, match] of scheduleMatches) {
    registerConfirmedWinner(match, matchId, slotStandings, teamsById, confirmedWinners);
    seen.add(matchId);
  }

  for (const [key, match] of Object.entries(liveMatches)) {
    const id = match.matchId ?? match.id ?? key;
    if (!isKnockoutBracketMatchId(id) || seen.has(id)) continue;
    registerConfirmedWinner(match, id, slotStandings, teamsById, confirmedWinners);
  }

  return confirmedWinners;
}

function slotCertainty(
  teamId: string | undefined,
  standings: GroupStanding[],
  qualContext: QualificationMatchContext
): "confirmed" | "tbd" {
  if (!teamId) return "tbd";
  return computeQualificationStatus(teamId, standings, qualContext).certainty === "confirmed"
    ? "confirmed"
    : "tbd";
}

function buildR32Match(
  slot: ReturnType<typeof getR32Slots>[number],
  scheduleMatches: Map<string, MergedMatch>,
  liveByOfficialSlot: Map<string, MergedMatch>,
  liveMatches: Record<string, MergedMatch>,
  liveByPair: Map<string, MergedMatch>,
  slotStandings: GroupStanding[],
  teamsById: TeamsById,
  standings: GroupStanding[],
  qualContext: QualificationMatchContext
): BracketMatch {
  const live = lookupLiveForSlot(
    slot,
    scheduleMatches,
    liveByOfficialSlot,
    liveMatches,
    liveByPair,
    slotStandings,
    teamsById
  );
  const isCompleted = live?.status === "completed" && live?.locked === true;
  const winnerTeamId =
    isCompleted && live ? resolveMatchWinner(live, teamsById) ?? undefined : undefined;

  const homeTeamId = live?.homeTeamId ?? slot.homeTeamId;
  const awayTeamId = live?.awayTeamId ?? slot.awayTeamId;

  return {
    id: slot.matchId,
    stage: "R32",
    label: slot.matchId,
    homeTeamId,
    awayTeamId,
    homeSeedLabel: slot.homeSource,
    awaySeedLabel: slot.awaySource,
    homeScore: isCompleted ? live?.homeScore : undefined,
    awayScore: isCompleted ? live?.awayScore : undefined,
    winnerTeamId,
    source: "scheduled",
    homeCertainty: live?.homeTeamId ? "confirmed" : slotCertainty(homeTeamId, standings, qualContext),
    awayCertainty: live?.awayTeamId ? "confirmed" : slotCertainty(awayTeamId, standings, qualContext),
    homeGhosts: [],
    awayGhosts: [],
    penaltyShootout: live?.penaltyShootout,
  };
}

function buildLaterRoundMatch(
  matchId: string,
  stage: Exclude<Stage, "R32">,
  homeSeed: string,
  awaySeed: string,
  confirmedWinners: Map<string, string>,
  scheduleMatches: Map<string, MergedMatch>,
  liveMatches: Record<string, MergedMatch>,
  teamsById: TeamsById
): BracketMatch {
  const homeFeederId = seedLabelToMatchId(homeSeed);
  const awayFeederId = seedLabelToMatchId(awaySeed);
  const homeTeamId = confirmedWinners.get(homeFeederId);
  const awayTeamId = confirmedWinners.get(awayFeederId);

  const live = lookupScheduleKnockoutMatch(scheduleMatches, liveMatches, matchId);
  const isCompleted = live?.status === "completed" && live?.locked === true;
  const winnerTeamId =
    isCompleted && live ? resolveMatchWinner(live, teamsById) ?? undefined : undefined;

  if (isCompleted && winnerTeamId) {
    confirmedWinners.set(matchId, winnerTeamId);
  }

  return {
    id: matchId,
    stage,
    label: matchId,
    homeTeamId,
    awayTeamId,
    homeSeedLabel: homeSeed,
    awaySeedLabel: awaySeed,
    homeScore: isCompleted ? live?.homeScore : undefined,
    awayScore: isCompleted ? live?.awayScore : undefined,
    winnerTeamId,
    source: "scheduled",
    homeCertainty: homeTeamId ? "confirmed" : "tbd",
    awayCertainty: awayTeamId ? "confirmed" : "tbd",
    homeGhosts: [],
    awayGhosts: [],
    penaltyShootout: live?.penaltyShootout,
  };
}

/**
 * Builds a knockout bracket from locked results only — no simulation or projection.
 */
export function buildConfirmedOnlyBracket(
  teams: Team[],
  matches: Match[],
  liveMatches: Record<string, MergedMatch>,
  qualContext: QualificationMatchContext
): { bracket: BracketMatch[]; standings: GroupStanding[] } {
  const teamsById: TeamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const scoredMatches: MatchWithScore[] = [];
  for (const match of matches) {
    if (match.homeScore === undefined || match.awayScore === undefined) continue;
    scoredMatches.push({
      ...match,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    });
  }
  const standings = computeStandings(scoredMatches, teams);
  const slotStandings = standingsForConfirmedSlots(standings, qualContext);
  const scheduleMatches = indexKnockoutScheduleMatches(teamsById, liveMatches, slotStandings);
  const liveByPair = indexLiveKnockoutByPair(liveMatches);
  const liveByOfficialSlot = indexLiveByOfficialSlot(liveMatches, slotStandings, teamsById);
  const confirmedWinners = indexConfirmedWinners(
    scheduleMatches,
    liveMatches,
    teamsById,
    slotStandings
  );

  const bracket: BracketMatch[] = [];

  for (const slot of getR32Slots(slotStandings, teamsById, qualContext)) {
    if (!knockoutSchedule[slot.matchId]) continue;
    const r32Match = buildR32Match(
      slot,
      scheduleMatches,
      liveByOfficialSlot,
      liveMatches,
      liveByPair,
      slotStandings,
      teamsById,
      standings,
      qualContext
    );
    bracket.push(r32Match);
    if (r32Match.winnerTeamId) {
      confirmedWinners.set(slot.matchId, r32Match.winnerTeamId);
    }
  }

  for (const stage of ["R16", "QF", "SF", "Final"] as const) {
    for (const [matchId, homeSeed, awaySeed] of KNOCKOUT_ROUND_FIXTURES[stage]) {
      if (!knockoutSchedule[matchId]) continue;
      const later = buildLaterRoundMatch(
        matchId,
        stage,
        homeSeed,
        awaySeed,
        confirmedWinners,
        scheduleMatches,
        liveMatches,
        teamsById
      );
      bracket.push(later);
    }
  }

  return { bracket, standings };
}
