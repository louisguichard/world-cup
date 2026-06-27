import type { GoalScorerProfile, MatchEvent, Team } from "../../types";
import { isApiEnabled } from "../../config/apiFlags";
import {
  fetchTeamPlayers,
  getWc2026TeamIdFromCache,
  isWorldCup2026Disabled,
  lookupWc2026Player,
  resolveWc2026TeamId,
  type Wc2026Player,
} from "../WorldCup2026Client";
import { countTournamentGoals } from "./countTournamentGoals";
import { matchPlayerInRoster } from "./matchPlayerInRoster";

function isGoalEvent(event: MatchEvent): boolean {
  return event.type === "goal" || event.type === "own_goal";
}

async function resolveWcTeamId(team: Team | undefined): Promise<string | undefined> {
  if (!team) return undefined;
  if (team.wc2026TeamId) return team.wc2026TeamId;
  return resolveWc2026TeamId(team.abbreviation);
}

function buildProfileFromRoster(
  event: MatchEvent,
  rosterPlayer: Wc2026Player | undefined,
  tournamentGoals: number
): GoalScorerProfile {
  const hometown =
    rosterPlayer?.hometown ?? rosterPlayer?.birthplace ?? rosterPlayer?.citizenship;

  return {
    eventId: event.providerId,
    playerId: rosterPlayer?.id ?? event.playerId,
    displayName: rosterPlayer?.fullName ?? event.playerName,
    minute: event.minute,
    minuteExtra: event.minuteExtra,
    teamId: event.teamId,
    isOwnGoal: event.type === "own_goal",
    photoUrl: rosterPlayer?.image ?? undefined,
    age: rosterPlayer?.age,
    hometown,
    nationality: rosterPlayer?.citizenship,
    currentClub: rosterPlayer?.club,
    position: rosterPlayer?.position,
    jerseyNumber: rosterPlayer?.jerseyNumber,
    tournamentGoals,
    internationalGoals: undefined,
    internationalAppearances: undefined,
  };
}

function buildFallbackProfile(event: MatchEvent, tournamentGoals: number): GoalScorerProfile {
  return {
    eventId: event.providerId,
    playerId: event.playerId,
    displayName: event.playerName,
    minute: event.minute,
    minuteExtra: event.minuteExtra,
    teamId: event.teamId,
    isOwnGoal: event.type === "own_goal",
    tournamentGoals,
  };
}

/** Loads enriched profiles for goal scorers in a match. */
export async function resolveGoalScorerProfiles(input: {
  events: MatchEvent[];
  homeTeam?: Team;
  awayTeam?: Team;
  allMatchEvents: Record<string, MatchEvent[]>;
}): Promise<GoalScorerProfile[]> {
  const goalEvents = input.events.filter(isGoalEvent);
  if (goalEvents.length === 0) return [];

  const canFetchRoster =
    isApiEnabled("wc2026Teams") && !isWorldCup2026Disabled();

  const rosterByTeamId = new Map<string, Wc2026Player[]>();

  if (canFetchRoster) {
    const teamIds = new Set(goalEvents.map((e) => e.teamId));
    const loadTasks: Array<Promise<void>> = [];

    for (const teamId of teamIds) {
      const team = teamId === input.homeTeam?.id ? input.homeTeam : input.awayTeam;
      loadTasks.push(
        (async () => {
          const wcId =
            team?.wc2026TeamId ??
            (team ? getWc2026TeamIdFromCache(team.abbreviation) : undefined) ??
            (await resolveWcTeamId(team));
          if (!wcId) {
            rosterByTeamId.set(teamId, []);
            return;
          }
          const players = await fetchTeamPlayers(wcId);
          rosterByTeamId.set(teamId, players);
        })()
      );
    }

    await Promise.all(loadTasks);
  }

  return goalEvents.map((event) => {
    const roster = rosterByTeamId.get(event.teamId) ?? [];
    const rosterPlayer = matchPlayerInRoster(roster, {
      playerId: event.playerId,
      playerName: event.playerName,
    });
    const tournamentGoals = countTournamentGoals(input.allMatchEvents, {
      playerId: rosterPlayer?.id ?? event.playerId,
      playerName: rosterPlayer?.fullName ?? event.playerName,
      teamId: event.teamId,
    });

    if (rosterPlayer) {
      return buildProfileFromRoster(event, rosterPlayer, tournamentGoals);
    }

    const fromIndex = lookupWc2026Player({
      playerId: event.playerId,
      playerName: event.playerName,
    });
    if (fromIndex) {
      return buildProfileFromRoster(event, fromIndex, tournamentGoals);
    }

    return buildFallbackProfile(event, tournamentGoals);
  });
}
