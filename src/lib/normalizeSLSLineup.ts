import type { Lineup } from "../types";
import type { SportsLiveScoresMatchBundleResponse } from "../types/sportsLiveScores";

/** Maps SLS `/football/match_lineups/{id}` to app lineups when shape is known. */
export function normalizeSLSLineup(
  _homeTeamId: string,
  _awayTeamId: string,
  _raw: SportsLiveScoresMatchBundleResponse
): Lineup[] | null {
  // TODO: verify SLS lineup shape against a live response before enabling sls_lineups_enabled.
  return null;
}
