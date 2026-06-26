import type { MergedMatch } from "../types";
import { deriveStandingsIfScored, standingsEqual } from "../lib/qualification";
import { getLockedSet } from "../store/slices/matchSlice";
import { useStore } from "../store";
import { fetchScoreboard } from "./ESPNClient";
import { applyLiveScore } from "./DataMerger";
import {
  applyEnrichmentEvents,
  enrichmentSourceLabel,
  fetchEnrichmentEvents,
} from "./liveEnrichment";
import { enrichMatchWithScheduleId } from "./ScheduleLinker";
import { scheduleSimulation } from "./SimulationScheduler";
import { logger } from "./Logger";

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 300_000;

function hasAnyLive(matches: Record<string, MergedMatch>): boolean {
  return Object.values(matches).some((m) => m.status === "live");
}

function allMatchesLocked(
  matches: Record<string, MergedMatch>,
  lockedMatchIds: Record<string, true>
): boolean {
  const ids = Object.keys(matches);
  if (ids.length === 0) return false;
  return ids.every((id) => lockedMatchIds[id] === true);
}

export function selectPrimaryMatch(
  matches: MergedMatch[],
  currentPrimaryId: string | null
): string | null {
  if (currentPrimaryId && matches.some((m) => m.id === currentPrimaryId && m.status === "live")) {
    return currentPrimaryId;
  }

  const live = matches.filter((m) => m.status === "live");
  if (live.length === 0) return matches[0]?.id ?? null;

  live.sort((a, b) => {
    const minA = (a.clockMinute ?? 0) + (a.clockExtra ?? 0);
    const minB = (b.clockMinute ?? 0) + (b.clockExtra ?? 0);
    return minB - minA;
  });

  return live[0]?.id ?? null;
}

class PollingEngine {
  private static instance: PollingEngine | null = null;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  static getInstance(): PollingEngine {
    if (!PollingEngine.instance) {
      PollingEngine.instance = new PollingEngine();
    }
    return PollingEngine.instance;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info("PollingEngine started", "PollingEngine");

    if (typeof window !== "undefined") {
      window.__pollingStatus = {
        running: true,
        liveMatchCount: 0,
        intervalMs: LIVE_INTERVAL_MS,
        lastPollAt: null,
        consecutiveErrors: 0
      };
    }

    void this.poll();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (typeof window !== "undefined" && window.__pollingStatus) {
      window.__pollingStatus.running = false;
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);

    const isLive = hasAnyLive(useStore.getState().liveMatches);
    const delay = isLive ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;

    if (typeof window !== "undefined" && window.__pollingStatus) {
      window.__pollingStatus.intervalMs = delay;
    }

    this.timer = setTimeout(() => void this.poll(), delay);
  }

  private refreshStandingsAndSimulation(merged: Record<string, MergedMatch>): void {
    const store = useStore.getState();
    const teamsList = Object.values(store.teams);
    if (teamsList.length === 0) return;

    const derived = deriveStandingsIfScored(Object.values(merged), teamsList);
    if (derived && !standingsEqual(derived, store.groupStandings)) {
      store.setGroupStandings(derived);
    }
    scheduleSimulation();
  }

  private async fetchAndMerge(): Promise<number> {
    const store = useStore.getState();
    let merged: Record<string, MergedMatch> = { ...store.liveMatches };
    const teams = store.teams;

    const espn = await fetchScoreboard();

    for (const m of espn.matches) {
      const applied = applyLiveScore(merged[m.id], {
        ...m,
        espnEventId: m.id
      }, "espn");
      merged[m.id] = enrichMatchWithScheduleId(applied, teams);
    }

    const { events: enrichmentEvents, source: enrichmentSource } = await fetchEnrichmentEvents();
    const enrichedCount = applyEnrichmentEvents(merged, enrichmentEvents, teams);

    logger.debug(enrichmentSourceLabel(enrichmentSource, enrichedCount), "PollingEngine", {
      espnCount: espn.matches.length,
      enrichmentEvents: enrichmentEvents.length,
      enrichmentSource,
      enrichedCount
    });

    for (const m of Object.values(merged)) {
      if (m.locked) {
        store.addLockedMatchId(m.id);
      }
    }

    const liveCount = Object.values(merged).filter((m) => m.status === "live").length;
    const primary = selectPrimaryMatch(Object.values(merged), store.primaryLiveMatchId);

    store.batchPollUpdate({
      matches: merged,
      lastPollAt: Date.now(),
      consecutiveErrors: 0
    });

    if (primary && primary !== store.primaryLiveMatchId) {
      store.setPrimaryMatch(primary);
    }

    this.refreshStandingsAndSimulation(merged);

    if (typeof window !== "undefined") {
      window.__pollingStatus = {
        running: this.running,
        liveMatchCount: liveCount,
        intervalMs: liveCount > 0 ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS,
        lastPollAt: Date.now(),
        consecutiveErrors: 0
      };
    }

    return liveCount;
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    const store = useStore.getState();
    let consecutiveErrors = store.consecutiveErrors;

    const matchIds = Object.keys(store.liveMatches);
    if (
      matchIds.length > 0 &&
      allMatchesLocked(store.liveMatches, store.lockedMatchIds)
    ) {
      logger.info("All matches locked — polling paused", "PollingEngine", {
        lockedCount: getLockedSet(store).size
      });
      this.scheduleNext();
      return;
    }

    try {
      await this.fetchAndMerge();
    } catch (error) {
      consecutiveErrors += 1;
      store.batchPollUpdate({
        matches: store.liveMatches,
        lastPollAt: Date.now(),
        consecutiveErrors
      });
      logger.error("Poll cycle failed", "PollingEngine", {
        error: error instanceof Error ? error.message : String(error),
        consecutiveErrors
      });

      if (typeof window !== "undefined" && window.__pollingStatus) {
        window.__pollingStatus.consecutiveErrors = consecutiveErrors;
        window.__pollingStatus.lastPollAt = Date.now();
      }
    }

    this.scheduleNext();
  }
}

export { PollingEngine };
