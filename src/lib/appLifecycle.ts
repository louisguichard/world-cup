import { PollingEngine } from "../services/PollingEngine";
import { logger } from "../services/Logger";
import { useStore } from "../store";
import { syncTournamentProfileIfNeeded } from "../services/teamProfile/TeamProfileSync";
import { syncWc2026CatalogIfNeeded } from "../services/wc2026/Wc2026PlayerSync";
import { syncWcLiveDrawIfNeeded } from "../services/WorldCup2026LiveClient";
import { startHighlightlyPostMatchSync } from "../services/highlights/HighlightlyPostMatchSync";

let stopHighlightlySync: (() => void) | null = null;

/** Start background services after a successful bootstrap (idempotent). */
export function startAppServices(): void {
  PollingEngine.getInstance().start();

  const store = useStore.getState();
  store.hydrateTeamProfiles();
  store.startTeamProfileSync();
  store.hydrateFootballPredictions();
  store.startFootballPredictionSync();
  store.hydrateFootApi7();
  store.startFootApi7Sync();
  store.hydrateWorldCupHistory();
  store.startWorldCupHistorySync();
  void syncTournamentProfileIfNeeded();
  void syncWc2026CatalogIfNeeded();
  void syncWcLiveDrawIfNeeded();

  stopHighlightlySync?.();
  stopHighlightlySync = startHighlightlyPostMatchSync(() => {
    const state = useStore.getState();
    return { liveMatches: state.liveMatches, teams: state.teams };
  });

  logger.info("App services started", "AppLifecycle");
}
