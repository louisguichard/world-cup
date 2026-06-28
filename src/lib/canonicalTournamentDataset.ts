import { mergeTeamsWithCatalog } from "../data/wc2026TeamCatalog";
import type { Match, MergedMatch, PolymarketMatchMarket, Team } from "../types";
import { materializeFullSchedule } from "./materializeFullSchedule";
import { buildPrediction, makeFallbackPrediction } from "./predictions";
import { resolvePolymarketOdds } from "./polymarketMatchOdds";

type CanonicalTournamentInput = {
  teams: Record<string, Team>;
  liveMatches: Record<string, MergedMatch>;
  knockoutMarkets: PolymarketMatchMarket[];
};

export type CanonicalTournamentDataset = {
  teamsById: Record<string, Team>;
  teams: Team[];
  matches: Match[];
};

function withPrediction(
  match: MergedMatch,
  teamsById: Record<string, Team>,
  knockoutMarkets: PolymarketMatchMarket[]
): Match {
  if (match.locked || match.prediction) {
    return match;
  }

  const home = teamsById[match.homeTeamId];
  const away = teamsById[match.awayTeamId];
  if (!home || !away) {
    return match;
  }

  const scoreSeed = `${match.id}-${home.id}-${away.id}`;
  const marketOdds = resolvePolymarketOdds(match, teamsById, knockoutMarkets);
  const prediction = marketOdds
    ? buildPrediction(marketOdds.probabilities, "polymarket", marketOdds.marketSlug, scoreSeed)
    : makeFallbackPrediction(home, away, scoreSeed);

  return { ...match, prediction };
}

/**
 * Builds one canonical tournament dataset used by projections/simulation.
 * Every consumer gets catalog-backed team IDs plus schedule-complete matches.
 */
export function buildCanonicalTournamentDataset(
  input: CanonicalTournamentInput
): CanonicalTournamentDataset {
  const teamsById = mergeTeamsWithCatalog(input.teams);
  const scheduleMatches = materializeFullSchedule(teamsById, input.liveMatches);
  const matches = scheduleMatches.map((match) =>
    withPrediction(match, teamsById, input.knockoutMarkets)
  );

  return {
    teamsById,
    teams: Object.values(teamsById),
    matches,
  };
}
