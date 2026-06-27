import {
  fetchAllPlayers,
  fetchTeams,
  isWorldCup2026Disabled,
} from "../WorldCup2026Client";
import {
  isWc2026PlayerCacheStale,
  readWc2026PlayerStore,
  writeWc2026PlayerStore,
} from "../../lib/wc2026PlayerCache";
import { logger } from "../Logger";
import { isApiEnabled } from "../../config/apiFlags";

export async function syncWc2026PlayerIndexIfNeeded(): Promise<number> {
  if (!isApiEnabled("wc2026Teams") || isWorldCup2026Disabled()) {
    return readWc2026PlayerStore().players.length;
  }

  const store = readWc2026PlayerStore();
  if (!isWc2026PlayerCacheStale(store.lastSyncAt) && store.players.length > 0) {
    return store.players.length;
  }

  logger.info("WC2026 player index sync started", "Wc2026PlayerSync");

  try {
    const players = await fetchAllPlayers();
    if (players.length === 0) {
      return store.players.length;
    }

    writeWc2026PlayerStore({
      version: 1,
      lastSyncAt: new Date().toISOString(),
      players,
    });

    logger.info("WC2026 player index sync finished", "Wc2026PlayerSync", { count: players.length });
    return players.length;
  } catch (error) {
    logger.warn("WC2026 player index sync failed", "Wc2026PlayerSync", {
      error: error instanceof Error ? error.message : String(error),
    });
    return store.players.length;
  }
}

/** Prefetch teams (tournament metadata + abbrev map) and player photos once per day. */
export async function syncWc2026CatalogIfNeeded(): Promise<void> {
  if (!isApiEnabled("wc2026Teams") || isWorldCup2026Disabled()) return;
  await fetchTeams();
  await syncWc2026PlayerIndexIfNeeded();
}
