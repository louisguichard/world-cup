import { buildKnockoutRoundSummaries } from "../components/bentos/KnockoutRoundStatusBento";
import { TOURNAMENT_RULES } from "./tournamentRules";
import { matchHasStoredEvents } from "./matchHasStoredEvents";
import type { MatchEvent, MergedMatch, Team } from "../types";

export const TOTAL_TOURNAMENT_MATCHES = TOURNAMENT_RULES.tournament_metadata.total_matches;
export const KNOCKOUT_FIELD_TEAMS = 32;

export type TournamentPulseViewModel = {
  teamsLeft: number;
  teamsLeftLabel: string;
  matchesPlayed: number;
  matchesRemaining: number;
  totalGoals: number;
  yellowCards: number;
  redCards: number;
  eventCoverage: {
    completedWithEvents: number;
    completedTotal: number;
  };
};

function isCompletedMatch(match: MergedMatch): boolean {
  return match.status === "completed" && match.locked === true;
}

function countGoalsFromScores(matches: MergedMatch[]): number {
  let total = 0;
  for (const match of matches) {
    if (!isCompletedMatch(match) && match.status !== "live") continue;
    if (match.homeScore == null || match.awayScore == null) continue;
    total += match.homeScore + match.awayScore;
  }
  return total;
}

function countDiscipline(matchEvents: Record<string, MatchEvent[]>): {
  yellowCards: number;
  redCards: number;
} {
  let yellowCards = 0;
  let redCards = 0;

  for (const events of Object.values(matchEvents)) {
    for (const event of events) {
      if (event.type === "yellow_card") yellowCards += 1;
      if (event.type === "red_card" || event.type === "yellow_red_card") redCards += 1;
    }
  }

  return { yellowCards, redCards };
}

function countKnockoutTeamsLeft(matches: MergedMatch[], teams: Record<string, Team>): number {
  const summaries = buildKnockoutRoundSummaries(matches, teams);
  const eliminated = new Set(summaries.flatMap((round) => round.eliminated));
  return Math.max(0, KNOCKOUT_FIELD_TEAMS - eliminated.size);
}

/** Pure tournament-wide counters for the Live pulse bento. */
export function buildTournamentPulseViewModel(input: {
  schedule: MergedMatch[];
  matchEvents: Record<string, MatchEvent[]>;
  teams: Record<string, Team>;
  isKnockoutActive: boolean;
}): TournamentPulseViewModel {
  const { schedule, matchEvents, teams, isKnockoutActive } = input;

  const completed = schedule.filter(isCompletedMatch);
  const matchesPlayed = completed.length;
  const matchesRemaining = Math.max(0, TOTAL_TOURNAMENT_MATCHES - matchesPlayed);

  let completedWithEvents = 0;
  for (const match of completed) {
    if (matchHasStoredEvents(match, matchEvents)) completedWithEvents += 1;
  }

  const { yellowCards, redCards } = countDiscipline(matchEvents);

  const teamsLeft = isKnockoutActive
    ? countKnockoutTeamsLeft(schedule, teams)
    : TOURNAMENT_RULES.tournament_metadata.total_teams;

  const teamsLeftLabel = isKnockoutActive ? "In knockout" : "In tournament";

  return {
    teamsLeft,
    teamsLeftLabel,
    matchesPlayed,
    matchesRemaining,
    totalGoals: countGoalsFromScores(schedule),
    yellowCards,
    redCards,
    eventCoverage: {
      completedWithEvents,
      completedTotal: matchesPlayed,
    },
  };
}
