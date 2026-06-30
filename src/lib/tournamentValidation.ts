import type { BracketMatch, MergedMatch } from "../types";
import { ROUND_OF_32_FIXTURES } from "./brackets/getR32Slots";
import { isKnockoutMatch } from "./resolveMatchWinner";
import { ruleMessage, type TournamentRuleViolation } from "./tournamentRules";

const SEMI_LOSER_LABELS = new Set(["L101", "L102"]);

/** ERR_003 — knockout results cannot terminate as an unresolved draw. */
export function validateMatchResult(
  match: Pick<
    MergedMatch,
    | "status"
    | "group"
    | "stage"
    | "matchId"
    | "id"
    | "homeScore"
    | "awayScore"
    | "decidedByPenalties"
    | "penaltyShootout"
  >
): TournamentRuleViolation | null {
  if (!isKnockoutMatch(match)) return null;
  if (match.status !== "completed") return null;

  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  if (home !== away) return null;

  const shootout = match.penaltyShootout;
  const resolvedByPenalties =
    match.decidedByPenalties === true ||
    (shootout != null && shootout.homeScore !== shootout.awayScore);

  if (resolvedByPenalties) return null;

  return {
    code: "ERR_003",
    message: ruleMessage("ERR_003"),
    context: { matchId: match.matchId ?? match.id, homeScore: home, awayScore: away },
  };
}

/** Anti-rematch — a third-place team cannot face their own group winner in R32 fixtures. */
export function validateThirdPlaceAntiRematch(
  fixtures: ReadonlyArray<readonly [string, string, string]> = ROUND_OF_32_FIXTURES
): TournamentRuleViolation | null {
  for (const [matchId, homeSeed, awaySeed] of fixtures) {
    const homeWinner = homeSeed.match(/^1([A-L])$/);
    const awayThird = awaySeed.match(/^3([A-L])$/);
    if (homeWinner && awayThird && homeWinner[1] === awayThird[1]) {
      return {
        code: "ANTI_REMATCH",
        message: ruleMessage("ANTI_REMATCH"),
        context: { matchId, homeSeed, awaySeed },
      };
    }

    const awayWinner = awaySeed.match(/^1([A-L])$/);
    const homeThird = homeSeed.match(/^3([A-L])$/);
    if (awayWinner && homeThird && awayWinner[1] === homeThird[1]) {
      return {
        code: "ANTI_REMATCH",
        message: ruleMessage("ANTI_REMATCH"),
        context: { matchId, homeSeed, awaySeed },
      };
    }
  }

  return null;
}

/** ERR_005 — knockout losers may only advance to M103 via L101/L102. */
export function validateKnockoutProgression(
  winnersByLabel: Record<string, string | undefined>,
  bracket: BracketMatch[]
): TournamentRuleViolation | null {
  for (const [label, teamId] of Object.entries(winnersByLabel)) {
    if (!teamId?.trim() || !label.startsWith("L")) continue;
    if (SEMI_LOSER_LABELS.has(label)) continue;

    for (const match of bracket) {
      if (match.id === "M103") continue;
      if (match.homeTeamId === teamId || match.awayTeamId === teamId) {
        return {
          code: "ERR_005",
          message: ruleMessage("ERR_005"),
          context: { loserLabel: label, teamId, illegalMatchId: match.id },
        };
      }
    }
  }

  return null;
}

export function logTournamentRuleViolation(
  violation: TournamentRuleViolation,
  source: string
): void {
  if (typeof console !== "undefined") {
    console.warn(`[${source}] ${violation.code}: ${violation.message}`, violation.context);
  }
}
