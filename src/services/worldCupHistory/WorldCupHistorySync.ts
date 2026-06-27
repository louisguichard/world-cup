import {
  delay,
  fetchBestYoungPlayer,
  fetchGoldenBall,
  fetchGoldenBoot,
  fetchGoldenGlove,
  fetchWinners,
  fetchWorldCupsDetails,
  fetchWorldCupDetailByYear,
  isWorldCupHistoryDisabled,
} from "../WorldCupHistoryClient";
import {
  isWorldCupHistoryStale,
  readWorldCupHistoryStore,
  writeWorldCupHistoryStore,
} from "../../lib/worldCupHistoryCache";
import { mergeWorldCupHistoryBundle } from "../../lib/worldCupHistoryStats";
import type { WorldCupHistoryBundle } from "../../types/worldCupHistory";
import { logger } from "../Logger";

const REQUEST_DELAY_MS = 850;

export function loadCachedWorldCupHistoryBundle(): WorldCupHistoryBundle | null {
  return readWorldCupHistoryStore().bundle;
}

export async function fetchWorldCupHistoryBundle(
  previous: WorldCupHistoryBundle | null = null
): Promise<WorldCupHistoryBundle> {
  const unavailable: string[] = [];

  const winners = await fetchWinners();
  if (winners.length === 0) unavailable.push("winners");

  await delay(REQUEST_DELAY_MS);
  const worldCups = await fetchWorldCupsDetails();
  if (worldCups.length === 0) unavailable.push("world_cups_details");

  await delay(REQUEST_DELAY_MS);
  const goldenBall = await fetchGoldenBall();
  if (goldenBall.length === 0) unavailable.push("golden_ball");

  await delay(REQUEST_DELAY_MS);
  const goldenBoot = await fetchGoldenBoot();
  if (goldenBoot.length === 0) unavailable.push("golden_boot");

  await delay(REQUEST_DELAY_MS);
  const bestYoungPlayer = await fetchBestYoungPlayer();
  if (bestYoungPlayer.length === 0) unavailable.push("best_young_player");

  await delay(REQUEST_DELAY_MS);
  const goldenGlove = await fetchGoldenGlove();
  if (goldenGlove.length === 0) unavailable.push("golden_glove");

  const raw: WorldCupHistoryBundle = {
    fetchedAt: new Date().toISOString(),
    winners,
    worldCups,
    goldenBall,
    goldenBoot,
    goldenGlove,
    bestYoungPlayer,
    yearDetails: previous?.yearDetails ?? {},
    unavailable,
    partial: unavailable.length > 0,
  };

  return mergeWorldCupHistoryBundle(raw);
}

export async function syncWorldCupHistoryIfNeeded(
  onBundle?: (bundle: WorldCupHistoryBundle) => void
): Promise<WorldCupHistoryBundle | null> {
  if (isWorldCupHistoryDisabled()) return loadCachedWorldCupHistoryBundle();

  const store = readWorldCupHistoryStore();
  if (!isWorldCupHistoryStale(store.lastSyncAt) && store.bundle) {
    return store.bundle;
  }

  logger.info("World Cup history daily sync started", "WorldCupHistorySync");

  try {
    const bundle = await fetchWorldCupHistoryBundle(store.bundle);
    const next = { version: 1 as const, lastSyncAt: new Date().toISOString(), bundle };
    writeWorldCupHistoryStore(next);
    onBundle?.(bundle);
    logger.info("World Cup history daily sync finished", "WorldCupHistorySync", {
      winners: bundle.winners.length,
      editions: bundle.worldCups.length,
      unavailable: bundle.unavailable,
    });
    return bundle;
  } catch (error) {
    logger.warn("World Cup history sync failed", "WorldCupHistorySync", {
      error: error instanceof Error ? error.message : String(error),
    });
    return store.bundle;
  }
}

export async function fetchWorldCupYearDetailIfNeeded(
  year: number,
  current: WorldCupHistoryBundle | null
): Promise<WorldCupHistoryBundle | null> {
  if (!current) return null;
  const key = String(year);
  if (current.yearDetails[key]) return current;

  const detail = await fetchWorldCupDetailByYear(year);
  if (!detail) return current;

  const merged = mergeWorldCupHistoryBundle({
    ...current,
    yearDetails: { ...current.yearDetails, [key]: detail },
  });

  const store = readWorldCupHistoryStore();
  writeWorldCupHistoryStore({
    version: 1,
    lastSyncAt: store.lastSyncAt,
    bundle: merged,
  });

  return merged;
}
