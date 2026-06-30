import type { MatchEvent, MergedMatch, PenaltyKick, PenaltyShootout } from "../types";
import { isKnockoutMatch } from "./resolveMatchWinner";

export type PenaltyAggregate = {
  home: number;
  away: number;
};

const PENALTY_KICK_TYPES = new Set<MatchEvent["type"]>(["goal", "penalty_missed", "penalty_saved"]);

function isPenaltyKickEvent(event: MatchEvent): boolean {
  return PENALTY_KICK_TYPES.has(event.type);
}

function isPostFtShootoutEvent(event: MatchEvent): boolean {
  return event.minute >= 120 && isPenaltyKickEvent(event);
}

function isShootoutEvent(event: MatchEvent, duringPenalties: boolean): boolean {
  if (duringPenalties && isPenaltyKickEvent(event)) return true;
  return isPostFtShootoutEvent(event);
}

/** Build shootout from Zafronix aggregate penalty totals when kick-by-kick data is unavailable. */
export function penaltyShootoutFromAggregate(aggregate: PenaltyAggregate): PenaltyShootout {
  const home: PenaltyKick[] = Array.from({ length: aggregate.home }, () => ({ scored: true }));
  const away: PenaltyKick[] = Array.from({ length: aggregate.away }, () => ({ scored: true }));
  return {
    home,
    away,
    homeScore: aggregate.home,
    awayScore: aggregate.away,
  };
}

/** Derive ordered penalty kicks from match events during or after the penalties period. */
export function penaltyShootoutFromEvents(
  events: MatchEvent[],
  homeTeamId: string,
  awayTeamId: string,
  duringPenalties: boolean
): PenaltyShootout | undefined {
  const shootoutEvents = events.filter((e) => isShootoutEvent(e, duringPenalties));
  if (shootoutEvents.length === 0) return undefined;

  const home: PenaltyKick[] = [];
  const away: PenaltyKick[] = [];

  for (const event of shootoutEvents) {
    const scored = event.type === "goal";
    const kick: PenaltyKick = { scored, playerName: event.playerName };
    if (event.teamId === homeTeamId) {
      home.push(kick);
    } else if (event.teamId === awayTeamId) {
      away.push(kick);
    }
  }

  if (home.length === 0 && away.length === 0) return undefined;

  return {
    home,
    away,
    homeScore: home.filter((k) => k.scored).length,
    awayScore: away.filter((k) => k.scored).length,
  };
}

export function derivePenaltyShootout(input: {
  events: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  period?: string;
  decidedByPenalties?: boolean;
  existing?: PenaltyShootout;
  aggregate?: PenaltyAggregate;
}): PenaltyShootout | undefined {
  if (input.existing) return input.existing;

  const duringPenalties = input.period === "penalties" || input.decidedByPenalties === true;
  const fromEvents = penaltyShootoutFromEvents(
    input.events,
    input.homeTeamId,
    input.awayTeamId,
    duringPenalties
  );
  if (fromEvents) return fromEvents;

  if (input.aggregate && (input.aggregate.home > 0 || input.aggregate.away > 0)) {
    return penaltyShootoutFromAggregate(input.aggregate);
  }

  return undefined;
}

export function matchHadPenaltyShootout(
  match: {
    homeScore?: number;
    awayScore?: number;
    penaltyShootout?: PenaltyShootout;
    period?: string;
    decidedByPenalties?: boolean;
  }
): boolean {
  if (match.penaltyShootout) return true;
  if (match.decidedByPenalties) return true;
  if (match.period === "penalties") return true;
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  return home === away && match.period === "full_time";
}

/** True when a completed knockout match was decided by penalty shootout. */
export function isKnockoutPenaltyDecided(
  match: MergedMatch,
  _shootout?: PenaltyShootout
): boolean {
  if (!isKnockoutMatch(match)) return false;
  if (match.status !== "completed") return false;

  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  if (home !== away) return false;

  return true;
}
