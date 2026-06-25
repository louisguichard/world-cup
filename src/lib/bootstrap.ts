import { loadWorldCupData } from "../lib/dataSources";
import { deriveStandings } from "../lib/qualification";
import { BOOTSTRAP_FLAGS } from "../config/apiFlags";
import { logger } from "../services/Logger";
import { fetchScoreboard } from "../services/ESPNClient";
import { applyLiveScore } from "../services/DataMerger";
import { enrichMatchWithScheduleId } from "../services/ScheduleLinker";
import { runCalibration, scheduleSimulation, BOOTSTRAP_ITERATIONS } from "../services/SimulationScheduler";
import { startAppServices } from "./appLifecycle";
import { useStore } from "../store";
import type { MergedMatch } from "../types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startBackgroundEnrichment(): void {
  if (!BOOTSTRAP_FLAGS.backgroundEnrichment) {
    logger.info("Background enrichment disabled in apiFlags", "Bootstrap");
    return;
  }

  void Promise.allSettled([loadWorldCupData({ skipTitleCalibration: true })])
    .then(([result]) => {
      if (result.status !== "fulfilled") {
        logger.warn("Background enrichment skipped", "Bootstrap", {
          reason: result.status === "rejected" ? String(result.reason) : "unknown"
        });
        return;
      }
      useStore.getState().hydrateFromBootstrap(result.value);
      scheduleSimulation();
      logger.info("Background enrichment complete", "Bootstrap");
    });
}

export async function bootstrap(): Promise<void> {
  const store = useStore.getState();
  store.setSplashPhase("loading");
  store.setSplashProgress(0, "Connecting to live data...");

  const slowTimer = setTimeout(() => {
    if (useStore.getState().splashPhase === "loading") {
      store.setSplashPhase("slow");
      store.setSplashProgress(15, "Taking longer than usual...");
    }
  }, 2000);

  try {
    let espnData: Awaited<ReturnType<typeof fetchScoreboard>> = { teams: [], matches: [] };

    try {
      const timeoutPromise = sleep(8000).then(() => {
        throw new Error("ESPN timeout after 8s");
      });
      espnData = await Promise.race([fetchScoreboard(), timeoutPromise]);
      clearTimeout(slowTimer);
      logger.info("ESPN fetch succeeded", "Bootstrap", { matchCount: espnData.matches.length });
    } catch (espnErr) {
      clearTimeout(slowTimer);
      logger.warn("ESPN unavailable — continuing with static data", "Bootstrap", {
        reason: espnErr instanceof Error ? espnErr.message : String(espnErr)
      });
      store.setSplashProgress(20, "Live data unavailable — loading schedule...");
    }

    startBackgroundEnrichment();

    if (!Object.keys(store.teams).length) {
      store.setTeams(Object.fromEntries(espnData.teams.map((t) => [t.id, t])));
    }

    store.setSplashProgress(35, "Loading live scores...");

    const teamsMap = useStore.getState().teams;
    const liveMatches: Record<string, MergedMatch> = {};

    for (const m of espnData.matches) {
      const merged = applyLiveScore(undefined, { ...m, espnEventId: m.id }, "espn");
      liveMatches[m.id] = enrichMatchWithScheduleId(merged, teamsMap);
    }
    store.setLiveMatches(liveMatches);

    const teamsList = Object.values(useStore.getState().teams);
    const scored = espnData.matches.filter(
      (m) => m.group && m.homeScore !== undefined && m.awayScore !== undefined
    ) as Parameters<typeof deriveStandings>[0];
    store.setGroupStandings(deriveStandings(scored, teamsList));

    store.setSplashProgress(65, "Running simulations...");

    if (BOOTSTRAP_FLAGS.bootstrapSimulation) {
      try {
        await runCalibration({ iterations: BOOTSTRAP_ITERATIONS });
      } catch (simErr) {
        logger.warn("Simulation skipped during bootstrap", "Bootstrap", {
          reason: simErr instanceof Error ? simErr.message : String(simErr)
        });
        store.setSplashProgress(85, "Simulation unavailable — loading app...");
      }
    } else {
      logger.warn("Bootstrap simulation skipped (apiFlags.bootstrapSimulation=false)", "Bootstrap");
    }

    await sleep(1200);
    store.setSplashPhase("done");
    startAppServices();
    logger.info("Bootstrap complete", "Bootstrap", {
      matchCount: espnData.matches.length,
      teamsCount: Object.keys(useStore.getState().teams).length
    });
  } catch (err) {
    clearTimeout(slowTimer);
    logger.error("Critical data load failed", "Bootstrap", {
      error: err instanceof Error ? err.message : String(err)
    });
    store.setSplashPhase("error");
    store.setSplashProgress(0, err instanceof Error ? err.message : "Load failed");
  }
}
