import {
  SOFA_RAPID_WC_SEASON_ID,
  SOFA_RAPID_WC_TOURNAMENT_ID,
} from "../../config/sofascoreRapidEndpoints";
import type { SofaTeamMedia, TeamProfileBundle } from "../../types/teamProfile";
import { isSofaScore6Disabled, fetchTeamMediaVideos } from "../SofaScore6Client";
import {
  delay,
  fetchTeamDetailRaw,
  fetchTeamLastMatchesRaw,
  fetchTeamNextMatchesRaw,
  fetchTeamRankingsRaw,
  fetchTeamSquadRaw,
  fetchTeamStatisticsRaw,
  fetchTeamTournamentsRaw,
  isSofaScoreRapidDisabled,
} from "../SofaScoreRapidClient";
import {
  fetchTeamDetailsRaw,
  fetchTeamPlayers,
  fetchTeamStatistics,
} from "../SofaScore6Client";
import {
  normalizeSofaTeamDetails,
  normalizeSofaTeamMedia,
  normalizeSofaTeamPlayers,
  normalizeSofaTeamStatistics,
} from "./normalizeTeamProfile";
import {
  normalizeSofaRapidEvents,
  normalizeSofaRapidRankings,
  normalizeSofaRapidSquad,
  normalizeSofaRapidStatistics,
  normalizeSofaRapidTeamDetails,
  normalizeSofaRapidTournamentNames,
} from "./normalizeSofaRapidTeamProfile";

const RAPID_UNAVAILABLE = [
  "teams/get-transfers",
  "teams/get-near-events",
  "categories/list",
  "categories/list-live",
];

const SOFA6_FALLBACK_UNAVAILABLE = [
  "team/transfer-history",
  "team/top-players",
];

async function fetchSofa6Fallback(
  abbrev: string,
  sofaTeamId: number
): Promise<TeamProfileBundle> {
  const [detailsRaw, playersRaw, statsRaw, mediaRaw] = await Promise.all([
    fetchTeamDetailsRaw(sofaTeamId),
    fetchTeamPlayers(sofaTeamId),
    fetchTeamStatistics(sofaTeamId, 16, 58210),
    fetchTeamMediaVideos(sofaTeamId),
  ]);

  return {
    abbrev: abbrev.toUpperCase(),
    sofaTeamId,
    fetchedAt: new Date().toISOString(),
    details: normalizeSofaTeamDetails(detailsRaw),
    players: normalizeSofaTeamPlayers(playersRaw),
    statistics: normalizeSofaTeamStatistics(statsRaw),
    media: normalizeSofaTeamMedia(mediaRaw),
    lastMatches: [],
    nextMatches: [],
    tournamentNames: [],
    unavailable: [...SOFA6_FALLBACK_UNAVAILABLE],
    source: "sofascore6",
  };
}

export async function fetchTeamProfileBundle(
  abbrev: string,
  sofaTeamId: number
): Promise<TeamProfileBundle> {
  if (isSofaScoreRapidDisabled()) {
    if (!isSofaScore6Disabled()) {
      return fetchSofa6Fallback(abbrev, sofaTeamId);
    }
    return emptyBundle(abbrev, sofaTeamId);
  }

  const detailsRaw = await fetchTeamDetailRaw(sofaTeamId);
  await delay(400);
  const squadRaw = await fetchTeamSquadRaw(sofaTeamId);
  await delay(400);
  const statsRaw = await fetchTeamStatisticsRaw(
    sofaTeamId,
    SOFA_RAPID_WC_TOURNAMENT_ID,
    SOFA_RAPID_WC_SEASON_ID
  );
  await delay(400);
  const rankingsRaw = await fetchTeamRankingsRaw(sofaTeamId);
  await delay(400);
  const lastRaw = await fetchTeamLastMatchesRaw(sofaTeamId);
  await delay(400);
  const nextRaw = await fetchTeamNextMatchesRaw(sofaTeamId);
  await delay(400);
  const tournamentsRaw = await fetchTeamTournamentsRaw(sofaTeamId);

  let media: SofaTeamMedia[] = [];
  if (!isSofaScore6Disabled()) {
    await delay(400);
    const mediaRaw = await fetchTeamMediaVideos(sofaTeamId);
    media = normalizeSofaTeamMedia(mediaRaw);
  }

  const details = normalizeSofaRapidTeamDetails(detailsRaw);
  const fifaRanking = normalizeSofaRapidRankings(rankingsRaw);
  if (details && fifaRanking != null) {
    details.fifaRanking = fifaRanking;
  }

  return {
    abbrev: abbrev.toUpperCase(),
    sofaTeamId,
    fetchedAt: new Date().toISOString(),
    details,
    players: normalizeSofaRapidSquad(squadRaw),
    statistics: normalizeSofaRapidStatistics(statsRaw),
    media,
    lastMatches: normalizeSofaRapidEvents(lastRaw, 6),
    nextMatches: normalizeSofaRapidEvents(nextRaw, 6),
    tournamentNames: normalizeSofaRapidTournamentNames(tournamentsRaw),
    unavailable: [...RAPID_UNAVAILABLE],
    source: "sofascore-rapid",
  };
}

function emptyBundle(abbrev: string, sofaTeamId: number): TeamProfileBundle {
  return {
    abbrev: abbrev.toUpperCase(),
    sofaTeamId,
    fetchedAt: new Date().toISOString(),
    details: null,
    players: [],
    statistics: null,
    media: [],
    lastMatches: [],
    nextMatches: [],
    tournamentNames: [],
    unavailable: ["sofascore-rapid", "sofascore6"],
    source: "sofascore-rapid",
  };
}

export { delay };
