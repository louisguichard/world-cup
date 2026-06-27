import type { GroupStanding } from "../../types";
import { isApiEnabled } from "../../config/apiFlags";
import { deriveStandingsIfScored } from "../../lib/qualification";
import { useStore } from "../../store";
import {
  fetchBracket as fetchZafronixBracket,
  fetchStandings as fetchZafronixStandings,
} from "../ZafronixClient";
import {
  fetchStandings as fetchWcLiveStandings,
  isWc2026LiveDisabled,
} from "../WorldCup2026LiveClient";
import { fetchGroups, isWorldCup2026Disabled } from "../WorldCup2026Client";
import {
  buildStandingsFromTeamGroups,
  mergeStandingsPartials,
  normalizeStandingsTeamIds,
  normalizeWCLiveStandings,
  normalizeWC2026Groups,
  normalizeZafronixBracket,
  normalizeZafronixStandings,
} from "../adapters/normalizeStandings";
import { fetchWithFallback, STANDINGS_SOURCE_PRIORITY } from "./FallbackChain";
import {
  enqueue,
  getResult,
  clearCache,
  DEFAULT_MATCH_ENRICHMENT_SOURCES,
  type EnrichmentJob,
  type EnrichmentResult,
} from "./EnrichmentQueue";
import { runBoot } from "./DataOrchestrator.boot";
import { runLiveTick } from "./DataOrchestrator.live";
import { MODULE_IDS } from "../../lib/moduleIds";

/** Master data coordinator — boot, live polling, enrichment, standings refresh. */
export class DataOrchestrator {
  private static instance: DataOrchestrator | null = null;

  static getInstance(): DataOrchestrator {
    if (!DataOrchestrator.instance) {
      DataOrchestrator.instance = new DataOrchestrator();
    }
    return DataOrchestrator.instance;
  }

  /** Boot: teams, schedule, standings, simulation. */
  async boot(): Promise<void> {
    return runBoot();
  }

  /** Live tick: Tier-1 consensus + enrichment cascade (light mode when idle). */
  async tickLive(options?: { light?: boolean }): Promise<number> {
    return runLiveTick(options);
  }

  /** On-demand match enrichment via EnrichmentQueue. */
  async enrichMatch(matchId: string): Promise<EnrichmentResult> {
    const job: EnrichmentJob = {
      matchId,
      priority: "high",
      sources: DEFAULT_MATCH_ENRICHMENT_SOURCES,
    };
    return enqueue(job);
  }

  /** Refreshes group standings from cascade sources. */
  async refreshStandings(): Promise<void> {
    const store = useStore.getState();
    const teamsList = Object.values(store.teams);
    const matches = Object.values(store.liveMatches);
    const derived = deriveStandingsIfScored(matches, teamsList);
    const seeded = buildStandingsFromTeamGroups(teamsList);
    const fallback = derived ?? (seeded.length > 0 ? seeded : []);
    const teamsById = Object.fromEntries(teamsList.map((t) => [t.id, t]));

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
        wc2026teams: async () =>
          isApiEnabled("wc2026Teams") && !isWorldCup2026Disabled()
            ? normalizeWC2026Groups(await fetchGroups())
            : [],
        static: async () => fallback,
      },
      fallback
    );

    if (Array.isArray(data) && data.length > 0) {
      store.setGroupStandings(
        normalizeStandingsTeamIds(mergeStandingsPartials(derived ?? [], data), teamsById)
      );
    } else if (fallback.length > 0) {
      store.setGroupStandings(normalizeStandingsTeamIds(fallback, teamsById));
    }
    store.touchModuleFreshness(MODULE_IDS.groupStandings);
  }

  /** Refreshes bracket-related standings from Zafronix bracket endpoint. */
  async refreshBracket(): Promise<GroupStanding[]> {
    const raw = await fetchZafronixBracket(2026);
    return normalizeZafronixBracket(raw);
  }

  /** Returns cached enrichment or null. */
  getEnrichment(matchId: string): EnrichmentResult | null {
    return getResult(matchId);
  }

  /** Clears enrichment session cache. */
  clearEnrichmentCache(matchId?: string): void {
    clearCache(matchId);
  }
}
