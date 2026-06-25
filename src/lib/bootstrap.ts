import { loadWorldCupData } from "../lib/dataSources";
import { deriveStandings } from "../lib/qualification";
import { logger } from "../services/Logger";
import { fetchScoreboard } from "../services/ESPNClient";
import { applyLiveScore } from "../services/DataMerger";
import { enrichMatchWithScheduleId } from "../services/ScheduleLinker";
import { runCalibration } from "../services/SimulationScheduler";
import { startAppServices } from "./appLifecycle";
import { useStore } from "../store";
import type { MergedMatch } from "../types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const espnPromise = fetchScoreboard();
    const timeoutPromise = sleep(8000).then(() => {
      throw new Error("ESPN timeout after 8s");
    });

    const espnData = await Promise.race([espnPromise, timeoutPromise]);
    clearTimeout(slowTimer);

    const enrichment = await Promise.allSettled([loadWorldCupData()]);

    if (enrichment[0]?.status === "fulfilled") {
      store.hydrateFromBootstrap(enrichment[0].value);
    }

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
    await runCalibration();

    await sleep(1200);
    store.setSplashPhase("done");
    startAppServices();
    logger.info("Bootstrap complete", "Bootstrap", { matchCount: espnData.matches.length });
  } catch (err) {
    clearTimeout(slowTimer);
    logger.error("Critical data load failed", "Bootstrap", {
      error: err instanceof Error ? err.message : String(err)
    });
    store.setSplashPhase("error");
    store.setSplashProgress(0, err instanceof Error ? err.message : "Load failed");
  }
}
