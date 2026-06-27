import {
  fetchFootApi7Groups,
  fetchFootApi7GroupStandings,
  fetchFootApi7Knockout,
  fetchFootApi7Rounds,
  fetchFootApi7Standings,
  fetchFootApi7Teams,
  isFootApi7Disabled,
} from "../FootApi7Client";
import {
  FOOTAPI7_WC_SEASON_ID,
  FOOTAPI7_WC_TOURNAMENT_ID,
} from "../../config/footApi7Endpoints";
import {
  isFootApi7Stale,
  readFootApi7Store,
  writeFootApi7Store,
} from "../../lib/footApi7Cache";
import type { FootApi7Bundle } from "../../types/footApi7";
import { logger } from "../Logger";

export function loadCachedFootApi7Bundle(): FootApi7Bundle | null {
  return readFootApi7Store().bundle;
}

export async function fetchFootApi7Bundle(): Promise<FootApi7Bundle> {
  const unavailable: string[] = [];
  const tournamentId = FOOTAPI7_WC_TOURNAMENT_ID;
  const seasonId = FOOTAPI7_WC_SEASON_ID;

  const [groups, standings, teams, rounds, knockout] = await Promise.all([
    fetchFootApi7Groups(tournamentId, seasonId),
    fetchFootApi7Standings(tournamentId, seasonId),
    fetchFootApi7Teams(tournamentId, seasonId),
    fetchFootApi7Rounds(tournamentId, seasonId),
    fetchFootApi7Knockout(tournamentId, seasonId),
  ]);

  if (!groups) unavailable.push("groups");
  if (!standings) unavailable.push("standings");
  if (!teams) unavailable.push("teams");
  if (!rounds) unavailable.push("rounds");
  if (!knockout) unavailable.push("knockout");

  const groupStandings = await fetchFootApi7GroupStandings(tournamentId, seasonId);

  return {
    fetchedAt: new Date().toISOString(),
    tournamentId,
    seasonId,
    groups,
    standings,
    teams,
    rounds,
    knockout,
    groupStandings,
    unavailable,
  };
}

export async function syncFootApi7IfNeeded(
  onBundle?: (bundle: FootApi7Bundle) => void
): Promise<FootApi7Bundle | null> {
  if (isFootApi7Disabled()) return loadCachedFootApi7Bundle();

  const store = readFootApi7Store();
  if (!isFootApi7Stale(store.lastSyncAt) && store.bundle) {
    return store.bundle;
  }

  logger.info("FootApi7 sync started", "FootApi7Sync");

  try {
    const bundle = await fetchFootApi7Bundle();
    const next = { version: 1 as const, lastSyncAt: new Date().toISOString(), bundle };
    writeFootApi7Store(next);
    onBundle?.(bundle);
    logger.info("FootApi7 sync finished", "FootApi7Sync", {
      groups: bundle.groupStandings.length,
      unavailable: bundle.unavailable,
    });
    return bundle;
  } catch (error) {
    logger.warn("FootApi7 sync failed", "FootApi7Sync", {
      error: error instanceof Error ? error.message : String(error),
    });
    return store.bundle;
  }
}
