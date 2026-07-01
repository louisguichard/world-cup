import { buildConfirmedOnlyBracket } from "./buildConfirmedOnlyBracket";
import { resolveKnockoutResults } from "../tournament";
import { isKnockoutMatch } from "../resolveMatchWinner";
import type { Match, MergedMatch, Team } from "../../types";
import type { QualificationMatchContext } from "../qualification";

/**
 * Live knockout context: official locked results + provisional live feeders only.
 * Avoids projectTournament putting eliminated teams in R16 as "confirmed".
 */
export function buildLiveKnockoutContextBracket(
  teams: Team[],
  matches: Match[],
  liveMatches: Record<string, MergedMatch>,
  qualContext: QualificationMatchContext
): ReturnType<typeof buildConfirmedOnlyBracket> {
  const base = buildConfirmedOnlyBracket(teams, matches, liveMatches, qualContext);
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const liveKnockout = Object.values(liveMatches).filter(
    (match) =>
      isKnockoutMatch(match) &&
      match.status === "live" &&
      typeof match.homeScore === "number" &&
      typeof match.awayScore === "number"
  );

  if (liveKnockout.length === 0) {
    return base;
  }

  return {
    ...base,
    bracket: resolveKnockoutResults(
      base.bracket,
      liveKnockout,
      teamsById,
      [],
      base.standings
    ),
  };
}
