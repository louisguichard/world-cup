import type { GroupStanding, MergedMatch, Team } from "../../types";
import { BOOTSTRAP_FLAGS, isApiEnabled } from "../../config/apiFlags";
import { loadWorldCupData } from "../../lib/dataSources";
import {
  espnBootTimeoutMs,
  isMobileBootProfile,
  shouldDeferHeavyBoot,
  splashMinimumHoldMs,
} from "../../lib/bootProfile";
import { hydrateBootFromCache, persistBootCache } from "../../lib/bootCache";
import { hasLiveMatchesInCache } from "../../lib/liveMatchCache";
import {
  finishBootTracking,
  formatBootReport,
  startBootPhase,
  startBootTracking,
  endBootPhase,
} from "../../lib/bootMetrics";
import { deriveStandingsIfScored } from "../../lib/qualification";
import { startAppServices } from "../../lib/appLifecycle";
import { useStore } from "../../store";
import { fetchScoreboard } from "../ESPNClient";
import { applyLiveScore } from "../DataMerger";
import { mergeEspnMatchIntoStore } from "../espnMatchMerge";
import { publishMatchEvents } from "../matchDetail/fetchMatchEvents";
import {
  fetchAllTeams as fetchZafronixTeams,
  fetchBracket as fetchZafronixBracket,
  fetchStandings as fetchZafronixStandings,
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
  normalizeZafronixStandings,
} from "../adapters/normalizeStandings";
import { applyTeamLogoOverrides } from "../../lib/resolveTeamLogo";
import {
  buildWc2026TeamCatalog,
  mergeTeamsWithCatalog,
  resolveCatalogTeamIdByName,
} from "../../data/wc2026TeamCatalog";
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
    byName.set(t.abbreviation.toLowerCase(), t.id);
  }

  const matches: Record<string, MergedMatch> = {};
  for (const entry of entries) {
    const homeId =
      resolveCatalogTeamIdByName(entry.homeTeam) ??
      byName.get(entry.homeTeam.toLowerCase()) ??
      entry.homeTeam;
    const awayId =
      resolveCatalogTeamIdByName(entry.awayTeam) ??
      byName.get(entry.awayTeam.toLowerCase()) ??
      entry.awayTeam;
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

  return applyTeamLogoOverrides(teams);
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
        const fromStandings = normalizeZafronixStandings(await fetchZafronixStandings(2026));
        if (fromStandings.length > 0) return fromStandings;
        return normalizeZafronixBracket(await fetchZafronixBracket(2026));
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

async function runBootstrapSim(): Promise<void> {
  if (!BOOTSTRAP_FLAGS.bootstrapSimulation) return;
  startBootPhase("simulation");
  try {
    const iterations = import.meta.env.DEV ? DEV_BOOTSTRAP_ITERATIONS : BOOTSTRAP_ITERATIONS;
    await runCalibration({ iterations });
    endBootPhase("simulation", `${iterations} iterations`);
  } catch (simErr) {
    endBootPhase("simulation", "skipped");
    logger.warn("Simulation skipped during bootstrap", "DataOrchestrator.boot", {
      reason: simErr instanceof Error ? simErr.message : String(simErr),
    });
    useStore.getState().setSplashProgress(85, "Simulation unavailable — loading app...");
  }
}

async function runDeferredEnrichment(
  espnTeamsMap: Record<string, Team>,
  liveMatches: MergedMatch[]
): Promise<void> {
  startBootPhase("deferred-enrichment");
  const store = useStore.getState();
  try {
    startBootPhase("teams-merge");
    const teams = await mergeTeamsFromCascade(
      Object.keys(store.teams).length ? store.teams : espnTeamsMap
    );
    store.setTeams(teams);
    endBootPhase("teams-merge");

    const teamsList = Object.values(teams);
    const standings = await loadStandingsWithFallback(liveMatches, teamsList);
    if (standings) {
      store.setGroupStandings(standings);
    }

    await runBootstrapSim();
    endBootPhase("deferred-enrichment", "complete");

    persistBootCache(store.teams, store.liveMatches, store.groupStandings);
  } catch (error) {
    endBootPhase("deferred-enrichment", "partial failure");
    logger.warn("Deferred enrichment failed", "DataOrchestrator.boot", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Runs splash bootstrap: ESPN, team cascade, matches, standings, simulation. */
export async function runBoot(): Promise<void> {
  startBootTracking();
  const store = useStore.getState();
  const mobileFast = isMobileBootProfile();
  store.setSplashPhase("loading");
  store.setSplashProgress(0, mobileFast ? "Loading live scores..." : "Connecting to live data...");

  const cached = hydrateBootFromCache();
  const hadCache = cached.hadCache;
  const hasLiveInCache = hasLiveMatchesInCache(cached.matches);
  const deferHeavy = shouldDeferHeavyBoot(mobileFast, hadCache, hasLiveInCache);

  if (hadCache) {
    store.setTeams(cached.teams);
    store.setLiveMatches(cached.matches);
    if (cached.standings.length > 0) {
      store.setGroupStandings(cached.standings);
    }
    for (const m of Object.values(cached.matches)) {
      if (m.locked) store.addLockedMatchId(m.id);
    }
    store.setSplashProgress(40, "Loading live scores...");
  }

  const slowTimer = setTimeout(() => {
    if (useStore.getState().splashPhase === "loading") {
      store.setSplashPhase("slow");
      store.setSplashProgress(hadCache ? 45 : 15, "Taking longer than usual...");
    }
  }, mobileFast ? 3_500 : 2_000);

  try {
    let espnData: Awaited<ReturnType<typeof fetchScoreboard>> = {
      teams: [],
      matches: [],
      eventsByMatchId: {},
    };

    startBootPhase("espn-fetch");
    try {
      const timeoutMs = espnBootTimeoutMs(mobileFast);
      const timeoutPromise = sleep(timeoutMs).then(() => {
        throw new Error(`ESPN timeout after ${timeoutMs / 1000}s`);
      });
      espnData = await Promise.race([fetchScoreboard(), timeoutPromise]);
      clearTimeout(slowTimer);
      endBootPhase("espn-fetch", `${espnData.matches.length} matches`);
      logger.info("ESPN fetch succeeded", "DataOrchestrator.boot", {
        matchCount: espnData.matches.length,
      });
    } catch (espnErr) {
      clearTimeout(slowTimer);
      endBootPhase("espn-fetch", "fallback to static schedule");
      logger.warn("ESPN unavailable — continuing with static data", "DataOrchestrator.boot", {
        reason: espnErr instanceof Error ? espnErr.message : String(espnErr),
      });
      store.setSplashProgress(20, "Live data unavailable — loading schedule...");
    }

    startBackgroundEnrichment();

    const espnTeamsMap = Object.fromEntries(espnData.teams.map((t) => [t.id, t]));
    const catalog = buildWc2026TeamCatalog();
    const mergedIncoming = mergeTeamsWithCatalog(
      Object.keys(store.teams).length ? store.teams : espnTeamsMap
    );
    const baseTeams = { ...catalog, ...mergedIncoming };

    startBootPhase("teams-merge");
    const teams = deferHeavy
      ? applyTeamLogoOverrides(baseTeams)
      : applyTeamLogoOverrides(await mergeTeamsFromCascade(baseTeams));
    endBootPhase("teams-merge", deferHeavy ? "catalog + local (APIs deferred)" : "catalog + API merge");
    store.setTeams(teams);

    store.setSplashProgress(hadCache ? 55 : 35, "Loading live scores...");

    startBootPhase("matches-build");
    const liveMatches: Record<string, MergedMatch> = {};

    if (espnData.matches.length > 0) {
      for (const m of espnData.matches) {
        const incoming = applyLiveScore(undefined, { ...m, espnEventId: m.id }, "espn");
        mergeEspnMatchIntoStore(liveMatches, incoming, teams);

        const detailEvents = espnData.eventsByMatchId[m.id];
        const storeMatch = liveMatches[m.id] ?? Object.values(liveMatches).find((x) => x.espnEventId === m.id);
        if (detailEvents?.length && storeMatch) {
          publishMatchEvents(storeMatch, detailEvents);
        }
      }
    } else {
      Object.assign(liveMatches, buildStaticMatches(teams));
    }

    store.setLiveMatches(liveMatches);
    for (const m of Object.values(liveMatches)) {
      if (m.locked) store.addLockedMatchId(m.id);
    }
    endBootPhase("matches-build", `${Object.keys(liveMatches).length} matches`);

    startBootPhase("standings-load");
    const teamsList = Object.values(useStore.getState().teams);
    const standings = deriveStandingsIfScored(Object.values(liveMatches), teamsList);
    endBootPhase("standings-load", standings ? "derived locally (APIs deferred)" : "empty");
    if (standings) {
      store.setGroupStandings(standings);
    }

    store.setSplashProgress(deferHeavy ? 80 : 65, deferHeavy ? "Almost ready..." : "Running simulations...");

    void runDeferredEnrichment(espnTeamsMap, Object.values(liveMatches));

    startBootPhase("splash-hold");
    await sleep(splashMinimumHoldMs(mobileFast, hadCache));
    endBootPhase("splash-hold");

    store.setSplashPhase("done");
    persistBootCache(
      useStore.getState().teams,
      useStore.getState().liveMatches,
      useStore.getState().groupStandings
    );
    startBootPhase("services-start");
    startAppServices();
    endBootPhase("services-start");

    finishBootTracking(deferHeavy ? "cache-first deferred path" : "full path");
    logger.info("Bootstrap complete", "DataOrchestrator.boot", {
      matchCount: Object.keys(liveMatches).length,
      teamsCount: Object.keys(useStore.getState().teams).length,
      mobileFast,
      hadCache,
      deferHeavy,
      bootMs: formatBootReport(),
    });
  } catch (err) {
    clearTimeout(slowTimer);
    logger.error("Critical data load failed", "DataOrchestrator.boot", {
      error: err instanceof Error ? err.message : String(err),
    });
    store.setSplashPhase("error");
    store.setSplashProgress(0, err instanceof Error ? err.message : "Load failed");
    finishBootTracking("error");
  }
}
