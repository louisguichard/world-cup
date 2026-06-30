import type { MergedMatch } from "../types";
import { shouldRunHeavyPoll, smartPollIntervalMs } from "../lib/pollPolicy";
import { shouldRunPollFallback } from "../config/liveDataFlags";
import { getLockedSet } from "../store/slices/matchSlice";
import { useStore } from "../store";
import { DataOrchestrator } from "./orchestrator/DataOrchestrator";
import { logger } from "./Logger";

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
    logger.info("PollingEngine started (smart schedule)", "PollingEngine");

    if (typeof window !== "undefined") {
      window.__pollingStatus = {
        running: true,
        liveMatchCount: 0,
        intervalMs: 300_000,
        lastPollAt: null,
        consecutiveErrors: 0,
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

  pauseForHiddenTab(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  resumeFromHiddenTab(): void {
    if (!this.running || typeof document === "undefined" || document.hidden) return;
    void this.poll();
  }

  private scheduleNext(): void {
    if (!this.running) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (this.timer) clearTimeout(this.timer);

    const allMatches = Object.values(useStore.getState().liveMatches);
    const { intervalMs, reason, phase } = smartPollIntervalMs(allMatches);

    const nextKickoffWakeup = this.msUntilNextImminentMatch(allMatches);
    const effectiveDelay = Math.min(intervalMs, nextKickoffWakeup);

    logger.debug(
      `Next poll in ${Math.round(effectiveDelay / 1000)}s — ${reason}`,
      "PollingEngine",
      { phase }
    );

    if (typeof window !== "undefined" && window.__pollingStatus) {
      window.__pollingStatus.intervalMs = effectiveDelay;
    }

    this.timer = setTimeout(() => void this.poll(), effectiveDelay);
  }

  /**
   * Returns ms until the earliest upcoming match enters the "imminent" window.
   * If a match kicks off in 20 min, we return (20min - 15min) = 5min
   * so the engine wakes up to start pre-polling.
   * Returns Infinity if no matches are coming up.
   */
  private msUntilNextImminentMatch(matches: MergedMatch[]): number {
    const IMMINENT_LEAD = 15 * 60 * 1000;
    const now = Date.now();
    let soonest = Infinity;
    for (const m of matches) {
      const kickoff =
        m.kickoffMs != null && !Number.isNaN(m.kickoffMs)
          ? m.kickoffMs
          : m.date
            ? Date.parse(m.date)
            : NaN;
      if (Number.isNaN(kickoff) || m.status === "completed" || m.locked) continue;
      const msUntilImminent = kickoff - IMMINENT_LEAD - now;
      if (msUntilImminent > 0 && msUntilImminent < soonest) {
        soonest = msUntilImminent;
      }
    }
    return soonest;
  }

  private async fetchAndMerge(): Promise<number> {
    const allMatches = Object.values(useStore.getState().liveMatches);
    const heavy = shouldRunHeavyPoll(allMatches);
    return DataOrchestrator.getInstance().tickLive({ light: !heavy });
  }

  private async poll(): Promise<void> {
    if (!this.running) return;
    if (typeof document !== "undefined" && document.hidden) return;

    if (!shouldRunPollFallback()) {
      this.scheduleNext();
      return;
    }

    const store = useStore.getState();
    const matchIds = Object.keys(store.liveMatches);
    if (
      matchIds.length > 0 &&
      allMatchesLocked(store.liveMatches, store.lockedMatchIds)
    ) {
      logger.info("All matches locked — polling paused", "PollingEngine", {
        lockedCount: getLockedSet(store).size,
      });
      this.scheduleNext();
      return;
    }

    let consecutiveErrors = store.consecutiveErrors;
    try {
      await this.fetchAndMerge();
      if (typeof window !== "undefined" && window.__pollingStatus) {
        window.__pollingStatus.consecutiveErrors = 0;
        window.__pollingStatus.lastPollAt = Date.now();
      }
    } catch (error) {
      consecutiveErrors += 1;
      store.batchPollUpdate({
        matches: store.liveMatches,
        lastPollAt: Date.now(),
        consecutiveErrors,
      });
      logger.error("Poll cycle failed", "PollingEngine", {
        error: error instanceof Error ? error.message : String(error),
        consecutiveErrors,
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
