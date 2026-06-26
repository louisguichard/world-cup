import type { GroupStanding } from "../../types";
import { isApiEnabled } from "../../config/apiFlags";
import { deriveStandingsIfScored } from "../../lib/qualification";
import { useStore } from "../../store";
import { fetchBracket as fetchZafronixBracket } from "../ZafronixClient";
import {
  fetchStandings as fetchWcLiveStandings,
  isWc2026LiveDisabled,
} from "../WorldCup2026LiveClient";
import { fetchGroups, isWorldCup2026Disabled } from "../WorldCup2026Client";
import {
  mergeStandingsPartials,
  normalizeWCLiveStandings,
  normalizeWC2026Groups,
  normalizeZafronixBracket,
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

  /** Live tick: Tier-1 consensus + enrichment cascade. */
  async tickLive(): Promise<number> {
    return runLiveTick();
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
    const fallback = derived ?? [];

    const { data } = await fetchWithFallback(
      STANDINGS_SOURCE_PRIORITY,
      {
        wclive: async () =>
          isApiEnabled("wc2026Live") && !isWc2026LiveDisabled()
            ? normalizeWCLiveStandings(await fetchWcLiveStandings())
            : [],
        zafronix: async () => normalizeZafronixBracket(await fetchZafronixBracket(2026)),
        wc2026teams: async () =>
          isApiEnabled("wc2026Teams") && !isWorldCup2026Disabled()
            ? normalizeWC2026Groups(await fetchGroups())
            : [],
        static: async () => fallback,
      },
      fallback
    );

    if (Array.isArray(data) && data.length > 0) {
      const merged = mergeStandingsPartials(derived ?? [], data);
      store.setGroupStandings(merged);
    } else if (derived) {
      store.setGroupStandings(derived);
    }
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
