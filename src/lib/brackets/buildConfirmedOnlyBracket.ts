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
import { lookupBracketLiveMatch, seedLabelToMatchId } from "../bracketTree";
import { computeStandings } from "../tournament";
import { computeQualificationStatus, type QualificationMatchContext } from "../qualification";
import { resolveMatchWinner } from "../resolveMatchWinner";
import { getR32Slots } from "./getR32Slots";
import { KNOCKOUT_ROUND_FIXTURES } from "./knockoutRoundFixtures";

type TeamsById = Record<string, Team>;

function indexConfirmedWinners(
  liveMatches: Record<string, MergedMatch>,
  teamsById: TeamsById
): Map<string, string> {
  const confirmedWinners = new Map<string, string>();
  for (const [key, match] of Object.entries(liveMatches)) {
    const id = match.matchId ?? match.id ?? key;
    if (match.status !== "completed" || !match.locked) continue;
    const winner = resolveMatchWinner(match, teamsById);
    if (winner) confirmedWinners.set(id, winner);
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
  liveMatches: Record<string, MergedMatch>,
  teamsById: TeamsById,
  standings: GroupStanding[],
  qualContext: QualificationMatchContext
): BracketMatch {
  const live = lookupBracketLiveMatch(liveMatches, slot.matchId);
  const isCompleted = live?.status === "completed" && live?.locked === true;
  const winnerTeamId =
    isCompleted && live ? resolveMatchWinner(live, teamsById) ?? undefined : undefined;

  return {
    id: slot.matchId,
    stage: "R32",
    label: slot.matchId,
    homeTeamId: slot.homeTeamId,
    awayTeamId: slot.awayTeamId,
    homeSeedLabel: slot.homeSource,
    awaySeedLabel: slot.awaySource,
    homeScore: isCompleted ? live?.homeScore : undefined,
    awayScore: isCompleted ? live?.awayScore : undefined,
    winnerTeamId,
    source: "scheduled",
    homeCertainty: slotCertainty(slot.homeTeamId, standings, qualContext),
    awayCertainty: slotCertainty(slot.awayTeamId, standings, qualContext),
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
  liveMatches: Record<string, MergedMatch>,
  teamsById: TeamsById
): BracketMatch {
  const homeFeederId = seedLabelToMatchId(homeSeed);
  const awayFeederId = seedLabelToMatchId(awaySeed);
  const homeTeamId = confirmedWinners.get(homeFeederId);
  const awayTeamId = confirmedWinners.get(awayFeederId);

  const live = lookupBracketLiveMatch(liveMatches, matchId);
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
  const confirmedWinners = indexConfirmedWinners(liveMatches, teamsById);

  const bracket: BracketMatch[] = [];

  for (const slot of getR32Slots(standings, teamsById, qualContext)) {
    if (!knockoutSchedule[slot.matchId]) continue;
    const r32Match = buildR32Match(slot, liveMatches, teamsById, standings, qualContext);
    bracket.push(r32Match);
    if (r32Match.winnerTeamId) {
      confirmedWinners.set(slot.matchId, r32Match.winnerTeamId);
    }
  }

  for (const stage of ["R16", "QF", "SF", "Final"] as const) {
    for (const [matchId, homeSeed, awaySeed] of KNOCKOUT_ROUND_FIXTURES[stage]) {
      if (!knockoutSchedule[matchId]) continue;
      bracket.push(
        buildLaterRoundMatch(
          matchId,
          stage,
          homeSeed,
          awaySeed,
          confirmedWinners,
          liveMatches,
          teamsById
        )
      );
    }
  }

  return { bracket, standings };
}
