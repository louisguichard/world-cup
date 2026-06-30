import type { GroupStanding, MergedMatch, Team } from "../../types";
import { buildQualificationContext, type QualificationMatchContext } from "../qualification";
import { resolveMatchWinner } from "../resolveMatchWinner";
import { isKnockoutBracketMatchId } from "../bracketTree";
import { getR32Slots } from "./getR32Slots";
import { KNOCKOUT_LATER_STAGES, KNOCKOUT_ROUND_FIXTURES } from "./knockoutRoundFixtures";
import { resolveOfficialKnockoutSlotId } from "./resolveOfficialKnockoutSlot";

export type KnockoutSide = {
  teamId?: string;
  source: string;
};

export type KnockoutParticipant = {
  home: KnockoutSide;
  away: KnockoutSide;
};

export type KnockoutParticipantMap = Record<string, KnockoutParticipant>;

function isKnockoutMatchId(matchId: string): boolean {
  return isKnockoutBracketMatchId(matchId);
}

function indexWinnersByOfficialSlot(
  liveMatches: Record<string, MergedMatch>,
  slotStandings: GroupStanding[],
  teams: Record<string, Team>
): Record<string, string | undefined> {
  const winners: Record<string, string | undefined> = {};

  for (const m of Object.values(liveMatches)) {
    const winner = resolveMatchWinner(m, teams);
    if (!winner) continue;
    const stored = m.matchId ?? m.id ?? "";
    const officialId = resolveOfficialKnockoutSlotId(m, stored, slotStandings, teams);
    if (!isKnockoutMatchId(officialId)) continue;
    winners[`W${officialId.slice(1)}`] = winner;
  }

  return winners;
}

/**
 * Single source of truth: derive knockout entrants from finalized group standings,
 * then overlay winners from locked knockout results for later rounds.
 */
export function resolveKnockoutParticipants(
  standings: GroupStanding[],
  teams: Record<string, Team>,
  liveMatches: Record<string, MergedMatch>,
  qualContext?: QualificationMatchContext
): KnockoutParticipantMap {
  if (standings.length === 0) return {};

  const context =
    qualContext ?? buildQualificationContext(Object.values(liveMatches), Object.values(teams));

  const slots: KnockoutParticipantMap = {};

  for (const r32 of getR32Slots(standings, teams, context)) {
    slots[r32.matchId] = {
      home: { teamId: r32.homeTeamId, source: r32.homeSource },
      away: { teamId: r32.awayTeamId, source: r32.awaySource },
    };
  }

  const winners = indexWinnersByOfficialSlot(liveMatches, standings, teams);

  for (const stage of KNOCKOUT_LATER_STAGES) {
    for (const [matchId, homeSource, awaySource] of KNOCKOUT_ROUND_FIXTURES[stage]) {
      slots[matchId] = {
        home: { teamId: winners[homeSource], source: homeSource },
        away: { teamId: winners[awaySource], source: awaySource },
      };
    }
  }

  return slots;
}
