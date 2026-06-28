import type { MergedMatch, Team } from "../../types";
import { materializeFullSchedule } from "../../lib/materializeFullSchedule";
import { canSpendHighlightlyRequests } from "../../lib/highlightlyQuota";
import { readHighlightIntro } from "../../lib/highlightlyStaticCache";
import { fetchHighlightIntroForMatch } from "./fetchHighlightIntro";
import { isSportHighlightsDisabled } from "../SportHighlightsClient";
import { logger } from "../Logger";

const SYNC_COOLDOWN_MS = 5 * 60_000;
let lastSyncAt = 0;

/** Queue post-match highlight intros for finished fixtures missing from static cache. */
export async function syncPostMatchHighlightIntros(
  matches: MergedMatch[],
  teams: Record<string, Team>,
  opts?: { maxPerRun?: number }
): Promise<number> {
  if (isSportHighlightsDisabled()) return 0;
  if (!canSpendHighlightlyRequests(2)) return 0;
  if (typeof document !== "undefined" && document.hidden) return 0;

  const now = Date.now();
  if (now - lastSyncAt < SYNC_COOLDOWN_MS) return 0;
  lastSyncAt = now;

  const maxPerRun = opts?.maxPerRun ?? 3;
  const pending = matches
    .filter((m) => m.status === "completed" && !readHighlightIntro(m.id))
    .slice(0, maxPerRun);

  let synced = 0;
  for (const match of pending) {
    if (!canSpendHighlightlyRequests(2)) break;
    const homeTeam = teams[match.homeTeamId];
    const awayTeam = teams[match.awayTeamId];
    await fetchHighlightIntroForMatch({ match, homeTeam, awayTeam });
    synced += 1;
  }

  if (synced > 0) {
    logger.info("Post-match highlight sync", "HighlightlyPostMatchSync", { synced });
  }
  return synced;
}

export function startHighlightlyPostMatchSync(getState: () => {
  liveMatches: Record<string, MergedMatch>;
  teams: Record<string, Team>;
}): () => void {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const { liveMatches, teams } = getState();
    const schedule = materializeFullSchedule(teams, liveMatches);
    void syncPostMatchHighlightIntros(schedule, teams);
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

  if (!document.hidden) {
    tick();
    startInterval();
  }

  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    stopInterval();
  };
}

/** Test-only reset */
export function resetHighlightlyPostMatchSyncForTests(): void {
  lastSyncAt = 0;
}
