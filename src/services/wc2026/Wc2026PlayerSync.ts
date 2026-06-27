import { fetchTeams, isWorldCup2026Disabled } from "../WorldCup2026Client";
import { readWc2026PlayerStore } from "../../lib/wc2026PlayerCache";
import { logger } from "../Logger";
import { isApiEnabled } from "../../config/apiFlags";

/** Prefetch tournament metadata + abbrev map. Rosters load per-team on demand. */
export async function syncWc2026CatalogIfNeeded(): Promise<void> {
  if (!isApiEnabled("wc2026Teams") || isWorldCup2026Disabled()) return;

  logger.info("WC2026 catalog sync started", "Wc2026PlayerSync");
  await fetchTeams();
  logger.info("WC2026 catalog sync finished", "Wc2026PlayerSync", {
    cachedPlayers: readWc2026PlayerStore().players.length,
  });
}
