import type { MergedMatch, Team } from "../../types";
import { resolveTeamAbbrevFromHint } from "../../data/wc2026TeamCatalog";
import { useStore } from "../../store";
import {
  buildKampMatchIndex,
  fetchKampMatchesIndex,
} from "./KampMatchesClient";
import { findKampRecordForMatch, linkKampMatchToStore } from "./linkKampMatch";
import { mapKampGoalsToEvents } from "./mapKampGoalsToEvents";
import { logger } from "../Logger";

const SYNC_COOLDOWN_MS = 5 * 60_000;
let lastSyncAt = 0;

function matchNeedsKamp(match: MergedMatch, supplements: Record<string, { source: string }>): boolean {
  if (match.status !== "completed") return false;
  return !supplements[match.id] && !(match.matchId && supplements[match.matchId]);
}

export async function applyKampEnrichmentForMatch(
  match: MergedMatch,
  teams: Record<string, Team>,
  index?: Map<string, import("../../schemas/kampMatches").KampMatchRecord>
): Promise<boolean> {
  const kampIndex =
    index ??
    buildKampMatchIndex(await fetchKampMatchesIndex(), resolveTeamAbbrevFromHint);
  const kamp = findKampRecordForMatch(match, kampIndex, teams);
  if (!kamp) return false;

  const store = useStore.getState();
  const supplement = {
    highlightsUrl: kamp.highlights_url,
    source: "andrekamp" as const,
    fetchedAt: Date.now(),
  };
  store.setMatchSupplement(match.id, supplement);
  if (match.matchId) store.setMatchSupplement(match.matchId, supplement);

  const existing =
    store.matchEvents[match.id] ??
    (match.matchId ? store.matchEvents[match.matchId] : undefined) ??
    [];
  if (existing.length === 0 && kamp.gols?.length) {
    const events = mapKampGoalsToEvents(kamp.gols, match.homeTeamId, match.awayTeamId, teams);
    if (events.length > 0) store.mergeMatchEvents(match.id, events);
  }

  return true;
}

/** Queue kamp supplements for finished fixtures missing enrichment. */
export async function syncPostMatchKampSupplements(
  matches: MergedMatch[],
  teams: Record<string, Team>,
  opts?: { maxPerRun?: number }
): Promise<number> {
  const store = useStore.getState();
  const pending = matches
    .filter((m) => matchNeedsKamp(m, store.matchSupplements))
    .slice(0, opts?.maxPerRun ?? 3);

  if (pending.length === 0) return 0;

  let synced = 0;
  try {
    const records = await fetchKampMatchesIndex();
    const index = buildKampMatchIndex(records, resolveTeamAbbrevFromHint);

    for (const match of pending) {
      const ok = await applyKampEnrichmentForMatch(match, teams, index);
      if (ok) synced += 1;
    }
  } catch (error) {
    logger.warn("Kamp post-match sync failed", "KampPostMatchSync", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (synced > 0) {
    logger.info("Post-match kamp sync", "KampPostMatchSync", { synced });
  }
  return synced;
}

export function startKampPostMatchSync(getState: () => {
  liveMatches: Record<string, MergedMatch>;
  teams: Record<string, Team>;
}): () => void {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const now = Date.now();
    if (now - lastSyncAt < SYNC_COOLDOWN_MS) return;
    lastSyncAt = now;

    const { liveMatches, teams } = getState();
    const schedule = Object.values(liveMatches);
    void syncPostMatchKampSupplements(schedule, teams);
  };

  const startInterval = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, SYNC_COOLDOWN_MS);
  };

  const stopInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const onVisibility = () => {
    if (document.hidden) {
      stopInterval();
    } else {
      tick();
      startInterval();
    }
  };

  if (typeof document !== "undefined" && !document.hidden) {
    tick();
    startInterval();
    document.addEventListener("visibilitychange", onVisibility);
  }

  return () => {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
    stopInterval();
  };
}

/** Fast path when a match newly completes. */
export function enqueueKampEnrichmentForCompletedMatch(
  match: MergedMatch,
  teams: Record<string, Team>
): void {
  void applyKampEnrichmentForMatch(match, teams);
}

export function resetKampPostMatchSyncForTests(): void {
  lastSyncAt = 0;
}

export { linkKampMatchToStore };
