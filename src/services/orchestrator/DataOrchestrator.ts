import type { GroupStanding } from "../../types";
import { writeStandingsCache } from "../../lib/standingsCache";
import { useStore } from "../../store";
import { fetchBracket as fetchZafronixBracket } from "../ZafronixClient";
import { normalizeZafronixBracket } from "../adapters/normalizeStandings";
import { resolveGroupStandings } from "../standings/resolveGroupStandings";
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
    if (teamsList.length === 0) return;

    const standings = await resolveGroupStandings({
      matches: Object.values(store.liveMatches),
      teamsList,
      currentStandings: store.groupStandings,
      includeRemote: true,
    });

    if (standings.length > 0) {
      store.setGroupStandings(standings);
      writeStandingsCache(standings);
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
