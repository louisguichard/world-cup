import type { GroupStanding, MergedMatch, Team } from "../../types";
import { BOOTSTRAP_FLAGS, isApiEnabled } from "../../config/apiFlags";
import { loadWorldCupData } from "../../lib/dataSources";
import { deriveStandingsIfScored } from "../../lib/qualification";
import { startAppServices } from "../../lib/appLifecycle";
import { useStore } from "../../store";
import { fetchScoreboard } from "../ESPNClient";
import { applyLiveScore } from "../DataMerger";
import { mergeEspnMatchIntoStore } from "../espnMatchMerge";
import {
  fetchAllTeams as fetchZafronixTeams,
  fetchBracket as fetchZafronixBracket,
  isZafronixDisabled,
} from "../ZafronixClient";
import {
  fetchAllTeams as fetchWc2026Teams,
  fetchGroups,
  isWorldCup2026Disabled,
  mergeTeamMetadata,
} from "../WorldCup2026Client";
import {
  fetchStandings as fetchWcLiveStandings,
  isWc2026LiveDisabled,
} from "../WorldCup2026LiveClient";
import {
  runCalibration,
  scheduleSimulation,
  BOOTSTRAP_ITERATIONS,
  DEV_BOOTSTRAP_ITERATIONS,
} from "../SimulationScheduler";
import { getAllScheduleEntries } from "../BroadcastLookup";
import { normalizeZafronixTeam, normalizeWC2026Team, mergeTeamPartials } from "../adapters/normalizeTeam";
import {
  mergeStandingsPartials,
  normalizeWCLiveStandings,
  normalizeWC2026Groups,
  normalizeZafronixBracket,
} from "../adapters/normalizeStandings";
import { logger } from "../Logger";
import {
  fetchWithFallback,
  STANDINGS_SOURCE_PRIORITY,
} from "./FallbackChain";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStaticMatches(teams: Record<string, Team>): Record<string, MergedMatch> {
  const entries = getAllScheduleEntries();
  const byName = new Map<string, string>();
  for (const t of Object.values(teams)) {
    byName.set(t.name.toLowerCase(), t.id);
    byName.set(t.shortName.toLowerCase(), t.id);
  }

  const matches: Record<string, MergedMatch> = {};
  for (const entry of entries) {
    const homeId = byName.get(entry.homeTeam.toLowerCase()) ?? entry.homeTeam;
    const awayId = byName.get(entry.awayTeam.toLowerCase()) ?? entry.awayTeam;
    const id = `M${entry.matchNumber}`;
    matches[id] = {
      id,
      matchId: id,
      date: entry.kickoff.utc,
      venue: `${entry.venue.name}, ${entry.venue.city}`,
      homeTeamId: homeId,
      awayTeamId: awayId,
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "model",
      group: entry.group as MergedMatch["group"],
    };
  }
  return matches;
}

async function mergeTeamsFromCascade(
  espnTeams: Record<string, Team>
): Promise<Record<string, Team>> {
  let teams = { ...espnTeams };

  if (isApiEnabled("zafronix") && !isZafronixDisabled()) {
    const profiles = await fetchZafronixTeams();
    for (const profile of profiles) {
      const partial = normalizeZafronixTeam(profile);
      const abbrev = partial.abbreviation?.toUpperCase();
      if (!abbrev) continue;
      const existing = Object.values(teams).find((t) => t.abbreviation.toUpperCase() === abbrev);
      if (existing) {
        const merged = mergeTeamPartials(existing, partial);
        teams[existing.id] = { ...existing, ...merged, rating: existing.rating };
      }
    }
    if (profiles.length > 0) {
      logger.info("Zafronix team crests merged", "DataOrchestrator.boot", { count: profiles.length });
    }
  }

  if (isApiEnabled("wc2026Teams") && !isWorldCup2026Disabled()) {
    const wcTeams = await fetchWc2026Teams();
    if (wcTeams.length > 0) {
      for (const wc of wcTeams) {
        const partial = normalizeWC2026Team(wc);
        const abbrev = partial.abbreviation?.toUpperCase();
        if (!abbrev) continue;
        const existing = Object.values(teams).find((t) => t.abbreviation.toUpperCase() === abbrev);
        if (existing) {
          const merged = mergeTeamPartials(existing, partial);
          teams[existing.id] = { ...existing, ...merged, rating: existing.rating };
        }
      }
      const { teams: patched, patched: count } = mergeTeamMetadata(teams, wcTeams);
      teams = patched;
      if (count > 0) {
        logger.info("WC2026 team metadata merged", "DataOrchestrator.boot", { patched: count });
      }
    }
  }

  return teams;
}

async function loadStandingsWithFallback(
  espnMatches: MergedMatch[],
  teamsList: Team[]
): Promise<GroupStanding[] | null> {
  const derived = deriveStandingsIfScored(espnMatches, teamsList);
  const fallback = derived ?? [];

  const { data } = await fetchWithFallback(
    STANDINGS_SOURCE_PRIORITY,
    {
      wclive: async () =>
        isApiEnabled("wc2026Live") && !isWc2026LiveDisabled()
          ? normalizeWCLiveStandings(await fetchWcLiveStandings())
          : [],
      zafronix: async () => {
        const raw = await fetchZafronixBracket(2026);
        return normalizeZafronixBracket(raw);
      },
      wc2026teams: async () => {
        const raw = await fetchGroups();
        return normalizeWC2026Groups(raw);
      },
      static: async () => fallback,
    },
    fallback
  );

  if (Array.isArray(data) && data.length > 0) {
    return mergeStandingsPartials(derived ?? [], data);
  }
  return derived;
}

function startBackgroundEnrichment(): void {
  if (!BOOTSTRAP_FLAGS.backgroundEnrichment) return;

  void (async () => {
    try {
      const worldCupResult = await loadWorldCupData({ skipTitleCalibration: true });
      useStore.getState().hydrateFromBootstrap(worldCupResult);
      scheduleSimulation();
      logger.info("Background Polymarket/FIFA enrichment complete", "DataOrchestrator.boot");
    } catch (error) {
      logger.warn("Background enrichment skipped", "DataOrchestrator.boot", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}

/** Runs splash bootstrap: ESPN, team cascade, matches, standings, simulation. */
export async function runBoot(): Promise<void> {
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
      logger.info("ESPN fetch succeeded", "DataOrchestrator.boot", {
        matchCount: espnData.matches.length,
      });
    } catch (espnErr) {
      clearTimeout(slowTimer);
      logger.warn("ESPN unavailable — continuing with static data", "DataOrchestrator.boot", {
        reason: espnErr instanceof Error ? espnErr.message : String(espnErr),
      });
      store.setSplashProgress(20, "Live data unavailable — loading schedule...");
    }

    startBackgroundEnrichment();

    const espnTeamsMap = Object.fromEntries(espnData.teams.map((t) => [t.id, t]));
    const teams = await mergeTeamsFromCascade(
      Object.keys(store.teams).length ? store.teams : espnTeamsMap
    );
    store.setTeams(teams);

    store.setSplashProgress(35, "Loading live scores...");

    const liveMatches: Record<string, MergedMatch> = {};

    if (espnData.matches.length > 0) {
      for (const m of espnData.matches) {
        const incoming = applyLiveScore(undefined, { ...m, espnEventId: m.id }, "espn");
        mergeEspnMatchIntoStore(liveMatches, incoming, teams);
      }
    } else {
      Object.assign(liveMatches, buildStaticMatches(teams));
    }

    store.setLiveMatches(liveMatches);
    for (const m of Object.values(liveMatches)) {
      if (m.locked) store.addLockedMatchId(m.id);
    }

    const teamsList = Object.values(useStore.getState().teams);
    const standings = await loadStandingsWithFallback(Object.values(liveMatches), teamsList);
    if (standings) {
      store.setGroupStandings(standings);
    }

    store.setSplashProgress(65, "Running simulations...");

    const runBootstrapSim = async (): Promise<void> => {
      if (!BOOTSTRAP_FLAGS.bootstrapSimulation) return;
      try {
        const iterations = import.meta.env.DEV ? DEV_BOOTSTRAP_ITERATIONS : BOOTSTRAP_ITERATIONS;
        await runCalibration({ iterations });
      } catch (simErr) {
        logger.warn("Simulation skipped during bootstrap", "DataOrchestrator.boot", {
          reason: simErr instanceof Error ? simErr.message : String(simErr),
        });
        store.setSplashProgress(85, "Simulation unavailable — loading app...");
      }
    };

    if (import.meta.env.DEV) {
      void runBootstrapSim();
    } else {
      await runBootstrapSim();
    }

    await sleep(1200);
    store.setSplashPhase("done");
    startAppServices();
    logger.info("Bootstrap complete", "DataOrchestrator.boot", {
      matchCount: Object.keys(liveMatches).length,
      teamsCount: Object.keys(useStore.getState().teams).length,
    });
  } catch (err) {
    clearTimeout(slowTimer);
    logger.error("Critical data load failed", "DataOrchestrator.boot", {
      error: err instanceof Error ? err.message : String(err),
    });
    store.setSplashPhase("error");
    store.setSplashProgress(0, err instanceof Error ? err.message : "Load failed");
  }
}
