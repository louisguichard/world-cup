import type { MatchEvent, MergedMatch } from "../types";
import { derivePlayerRating } from "./playerRating";
import { resolveEventsForMatch } from "./resolveMatchEvents";

export type MatchAwardKind =
  | "man_of_the_match"
  | "top_scorer"
  | "assist_leader"
  | "fair_play";

export type MatchAward = {
  kind: MatchAwardKind;
  playerName: string;
  teamId: string;
  playerId?: string;
  detail?: string;
  /** Derived from live events until an official provider confirms awards. */
  source: "derived" | "official";
};

export type CompletedMatchAwards = {
  matchId: string;
  match: MergedMatch;
  awards: MatchAward[];
};

type PlayerMatchStats = {
  playerName: string;
  teamId: string;
  playerId?: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

function isCompleted(match: MergedMatch): boolean {
  return match.status === "completed" || match.locked === true;
}

function collectPlayerStats(events: MatchEvent[]): Map<string, PlayerMatchStats> {
  const stats = new Map<string, PlayerMatchStats>();

  const touch = (event: MatchEvent): PlayerMatchStats => {
    const key = `${event.teamId}::${event.playerId ?? event.playerName}`;
    const hit = stats.get(key);
    if (hit) return hit;
    const entry: PlayerMatchStats = {
      playerName: event.playerName,
      teamId: event.teamId,
      playerId: event.playerId,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    };
    stats.set(key, entry);
    return entry;
  };

  for (const event of events) {
    if (event.type === "goal") {
      touch(event).goals += 1;
      if (event.assistName) {
        const assistKey = `${event.teamId}::${event.assistName}`;
        const assist =
          stats.get(assistKey) ??
          (() => {
            const entry: PlayerMatchStats = {
              playerName: event.assistName!,
              teamId: event.teamId,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
            };
            stats.set(assistKey, entry);
            return entry;
          })();
        assist.assists += 1;
      }
    }
    if (event.type === "yellow_card") touch(event).yellowCards += 1;
    if (event.type === "red_card" || event.type === "yellow_red_card") {
      touch(event).redCards += 1;
    }
  }

  return stats;
}

function pickManOfTheMatch(players: PlayerMatchStats[]): PlayerMatchStats | null {
  if (players.length === 0) return null;

  let best: PlayerMatchStats | null = null;
  let bestRating = -1;

  for (const player of players) {
    const rating = derivePlayerRating({
      minutesPlayed: 90,
      goals: player.goals,
      assists: player.assists,
      yellowCards: player.yellowCards,
      redCards: player.redCards,
    });
    if (rating > bestRating) {
      bestRating = rating;
      best = player;
    }
  }

  return best;
}

/** Builds per-match award rows for completed fixtures from event data. */
export function deriveMatchAwards(input: {
  matches: MergedMatch[];
  matchEvents: Record<string, MatchEvent[]>;
}): CompletedMatchAwards[] {
  const completed = input.matches
    .filter(isCompleted)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  return completed.map((match) => {
    const events = resolveEventsForMatch(match, input.matchEvents);
    const stats = [...collectPlayerStats(events).values()];
    const awards: MatchAward[] = [];

    const motm = pickManOfTheMatch(stats);
    if (motm) {
      awards.push({
        kind: "man_of_the_match",
        playerName: motm.playerName,
        teamId: motm.teamId,
        playerId: motm.playerId,
        detail: "Based on goals, assists, and discipline in this match",
        source: "derived",
      });
    }

    const topScorers = stats.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals);
    if (topScorers[0] && topScorers[0].goals > 1) {
      awards.push({
        kind: "top_scorer",
        playerName: topScorers[0].playerName,
        teamId: topScorers[0].teamId,
        playerId: topScorers[0].playerId,
        detail: `${topScorers[0].goals} goals`,
        source: "derived",
      });
    }

    const assistLeaders = stats.filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists);
    if (assistLeaders[0] && assistLeaders[0].assists > 1) {
      awards.push({
        kind: "assist_leader",
        playerName: assistLeaders[0].playerName,
        teamId: assistLeaders[0].teamId,
        playerId: assistLeaders[0].playerId,
        detail: `${assistLeaders[0].assists} assists`,
        source: "derived",
      });
    }

    return {
      matchId: match.matchId ?? match.id,
      match,
      awards,
    };
  });
}

export function awardKindLabel(kind: MatchAwardKind): string {
  switch (kind) {
    case "man_of_the_match":
      return "Man of the Match";
    case "top_scorer":
      return "Match Top Scorer";
    case "assist_leader":
      return "Playmaker";
    case "fair_play":
      return "Fair Play";
    default: {
      const _never: never = kind;
      return String(_never);
    }
  }
}
