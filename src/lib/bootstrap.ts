import { loadWorldCupData } from "../lib/dataSources";
import { deriveStandingsIfScored } from "../lib/qualification";
import { BOOTSTRAP_FLAGS, isApiEnabled } from "../config/apiFlags";
import { logger } from "../services/Logger";
import { fetchScoreboard } from "../services/ESPNClient";
import { applyLiveScore } from "../services/DataMerger";
import { mergeEspnMatchIntoStore } from "../services/espnMatchMerge";
import {
  fetchTeams as fetchWc2026Teams,
  isWorldCup2026Disabled,
  mergeTeamMetadata,
} from "../services/WorldCup2026Client";
import { runCalibration, scheduleSimulation, BOOTSTRAP_ITERATIONS, DEV_BOOTSTRAP_ITERATIONS } from "../services/SimulationScheduler";
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

  void (async () => {
    const [worldCupResult, wcTeamsResult] = await Promise.allSettled([
      loadWorldCupData({ skipTitleCalibration: true }),
      isApiEnabled("wc2026Teams") && !isWorldCup2026Disabled()
        ? fetchWc2026Teams()
        : Promise.resolve([]),
    ]);

    if (worldCupResult.status === "fulfilled") {
      useStore.getState().hydrateFromBootstrap(worldCupResult.value);
      scheduleSimulation();
      logger.info("Background enrichment complete", "Bootstrap");
    } else {
      logger.warn("Background enrichment skipped", "Bootstrap", {
        reason: String(worldCupResult.reason),
      });
    }

    if (wcTeamsResult.status === "fulfilled" && wcTeamsResult.value.length > 0) {
      const store = useStore.getState();
      const { teams, patched } = mergeTeamMetadata(store.teams, wcTeamsResult.value);
      if (patched > 0) {
        store.setTeams(teams);
        logger.info("WC2026 team metadata merged", "Bootstrap", { patched });
      }
    }
  })();
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
      const incoming = applyLiveScore(undefined, { ...m, espnEventId: m.id }, "espn");
      mergeEspnMatchIntoStore(liveMatches, incoming, teamsMap);
    }
    store.setLiveMatches(liveMatches);
    for (const m of Object.values(liveMatches)) {
      if (m.locked) {
        store.addLockedMatchId(m.id);
      }
    }

    const teamsList = Object.values(useStore.getState().teams);
    const scored = espnData.matches.filter(
      (m) => m.group && m.homeScore !== undefined && m.awayScore !== undefined
    );
    const derived = deriveStandingsIfScored(espnData.matches, teamsList);
    if (derived) {
      store.setGroupStandings(derived);
      logger.info("Standings derived from ESPN", "Bootstrap", { scoredMatches: scored.length });
    } else {
      logger.info("No ESPN group matches — preserving standings", "Bootstrap");
    }

    store.setSplashProgress(65, "Running simulations...");

    const runBootstrapSim = async (): Promise<void> => {
      if (!BOOTSTRAP_FLAGS.bootstrapSimulation) {
        logger.warn("Bootstrap simulation skipped (apiFlags.bootstrapSimulation=false)", "Bootstrap");
        return;
      }
      try {
        const bootstrapIterations = import.meta.env.DEV ? DEV_BOOTSTRAP_ITERATIONS : BOOTSTRAP_ITERATIONS;
        await runCalibration({ iterations: bootstrapIterations });
      } catch (simErr) {
        logger.warn("Simulation skipped during bootstrap", "Bootstrap", {
          reason: simErr instanceof Error ? simErr.message : String(simErr)
        });
        store.setSplashProgress(85, "Simulation unavailable — loading app...");
      }
    };

    if (import.meta.env.DEV) {
      // Dev sim (~40s on main thread) runs after splash so Chrome stays interactive during load.
      void runBootstrapSim();
    } else {
      await runBootstrapSim();
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
