import type { KnockoutParticipant } from "./resolveKnockoutParticipants";

/** Reject impossible R16+ slots where both sides resolved to the same team id. */
export function sanitizeKnockoutParticipant(
  participant: KnockoutParticipant
): KnockoutParticipant {
  const homeId = participant.home.teamId?.trim();
  const awayId = participant.away.teamId?.trim();
  if (!homeId || !awayId || homeId !== awayId) return participant;

  return {
    home: participant.home,
    away: { teamId: undefined, source: participant.away.source },
  };
}

export function sanitizeKnockoutTeamPair(
  homeTeamId: string | undefined,
  awayTeamId: string | undefined
): { homeTeamId: string; awayTeamId: string } {
  const home = homeTeamId?.trim() ?? "";
  const away = awayTeamId?.trim() ?? "";
  if (home && away && home === away) {
    return { homeTeamId: home, awayTeamId: "" };
  }
  return { homeTeamId: home, awayTeamId: away };
}
