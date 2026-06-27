import type { MatchEvent, MergedMatch, Team, TournamentPlayerStat } from "../types";
import { normalizePlayerName, playerNamesMatch } from "../services/playerProfile/normalizePlayerName";
import { resolveEventsForMatch } from "./resolveMatchEvents";

type PlayerAccumulator = {
  key: string;
  displayName: string;
  teamId: string;
  playerId?: string;
  goals: number;
  assists: number;
};

function playerKey(teamId: string, name: string, playerId?: string): string {
  if (playerId) return `${teamId}::id::${playerId}`;
  return `${teamId}::name::${normalizePlayerName(name)}`;
}

function upsertPlayer(
  map: Map<string, PlayerAccumulator>,
  opts: { teamId: string; name: string; playerId?: string }
): PlayerAccumulator {
  const key = playerKey(opts.teamId, opts.name, opts.playerId);
  const existing = map.get(key);
  if (existing) return existing;

  const entry: PlayerAccumulator = {
    key,
    displayName: opts.name,
    teamId: opts.teamId,
    playerId: opts.playerId,
    goals: 0,
    assists: 0,
  };
  map.set(key, entry);
  return entry;
}

function findPlayerByName(
  map: Map<string, PlayerAccumulator>,
  teamId: string,
  name: string
): PlayerAccumulator | undefined {
  for (const entry of map.values()) {
    if (entry.teamId === teamId && playerNamesMatch(entry.displayName, name)) {
      return entry;
    }
  }
  return undefined;
}

function toStat(entry: PlayerAccumulator, value: number): TournamentPlayerStat {
  return {
    player: {
      id: entry.playerId ?? entry.key,
      displayName: entry.displayName,
    },
    teamId: entry.teamId,
    value,
  };
}

/** Aggregates 2026 tournament goals and assists from recorded match events. */
export function aggregateTournamentStats(input: {
  matches: MergedMatch[];
  matchEvents: Record<string, MatchEvent[]>;
}): {
  topScorers: TournamentPlayerStat[];
  topAssists: TournamentPlayerStat[];
} {
  const players = new Map<string, PlayerAccumulator>();

  for (const match of input.matches) {
    const events = resolveEventsForMatch(match, input.matchEvents);
    for (const event of events) {
      if (event.type !== "goal" || !event.playerName) continue;

      const scorer = upsertPlayer(players, {
        teamId: event.teamId,
        name: event.playerName,
        playerId: event.playerId,
      });
      scorer.goals += 1;

      if (event.assistName) {
        const assist =
          findPlayerByName(players, event.teamId, event.assistName) ??
          upsertPlayer(players, {
            teamId: event.teamId,
            name: event.assistName,
          });
        assist.assists += 1;
      }
    }
  }

  const topScorers = [...players.values()]
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.displayName.localeCompare(b.displayName))
    .map((p) => toStat(p, p.goals));

  const topAssists = [...players.values()]
    .filter((p) => p.assists > 0)
    .sort((a, b) => b.assists - a.assists || a.displayName.localeCompare(b.displayName))
    .map((p) => toStat(p, p.assists));

  return { topScorers, topAssists };
}

export function teamLabel(teamId: string, teams: Record<string, Team>): string {
  const team = teams[teamId];
  return team?.name ?? team?.shortName ?? teamId;
}
