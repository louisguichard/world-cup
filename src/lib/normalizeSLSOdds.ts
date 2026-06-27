import type { OddsSnapshot } from "../types";
import type { SportsLiveScoresOddsResponse } from "../types/sportsLiveScores";
import { logger } from "../services/Logger";

/** Maps SLS `/get_odds/{id}` payload to app OddsSnapshot when shape is compatible. */
export function normalizeSLSOdds(
  matchId: string,
  raw: SportsLiveScoresOddsResponse
): OddsSnapshot | null {
  const home =
    typeof raw.home_win === "number"
      ? raw.home_win
      : typeof raw.homeWin === "number"
        ? raw.homeWin
        : typeof raw["Home Win"] === "number"
          ? (raw["Home Win"] as number)
          : undefined;
  const draw =
    typeof raw.draw === "number"
      ? raw.draw
      : typeof raw["Draw"] === "number"
        ? (raw["Draw"] as number)
        : undefined;
  const away =
    typeof raw.away_win === "number"
      ? raw.away_win
      : typeof raw.awayWin === "number"
        ? raw.awayWin
        : typeof raw["Away Win"] === "number"
          ? (raw["Away Win"] as number)
          : undefined;

  if (home === undefined || draw === undefined || away === undefined) {
    logger.debug("[SLS Odds] shape mismatch — skipping", "useMatchOdds");
    return null;
  }

  return {
    matchId,
    homeWin: home,
    draw,
    awayWin: away,
    fetchedAt: Date.now(),
    source: "sportsbook",
  };
}
