import type { MergedMatch } from "../../types";
import { enrichMatchesPenaltyShootouts } from "../../lib/enrichMatchPenaltyShootout";
import { enrichKnockoutPenaltiesFromZafronix } from "../../lib/fetchKnockoutPenaltyResult";
import { reconcileEspnLiveAuthority } from "../../lib/espnLiveAuthority";
import { deriveStandingsIfScored, standingsEqual } from "../../lib/qualification";
import { writeLiveMatchCache } from "../../lib/liveMatchCache";
import { readStandingsCache, writeStandingsCache } from "../../lib/standingsCache";
import { mergeStandingsPartials } from "../adapters/normalizeStandings";
import { useStore } from "../../store";
import { fetchScoreboard } from "../ESPNClient";
import { applyLiveScore, applySecondaryScorePatch } from "../DataMerger";
import {
  applyEnrichmentEvents,
  enrichmentSourceLabel,
  fetchEnrichmentEvents,
} from "../liveEnrichment";
import { mergeEspnMatchIntoStore, isProtectedFromEspnOverwrite } from "../espnMatchMerge";
import { findStoreMatchForExternalVote } from "../matchLinking";
import { fetchLive as fetchWcLive } from "../WorldCup2026LiveClient";
import { fetchLiveEvents as fetchSportApiLive } from "../SportAPI7Client";
import { normalizeWCLiveMatch } from "../adapters/normalizeMatch";
import { publishMatchEvents, fetchMatchEvents } from "../matchDetail/fetchMatchEvents";
import { scheduleSimulation } from "../SimulationScheduler";
import { enqueueKampEnrichmentForCompletedMatch } from "../kamp/KampPostMatchSync";
import { fetchWc2026Live, isFifaPublicDisabled } from "../FifaPublicClient";
import { normalizeFifaPublicLiveMatch } from "../adapters/normalizeFifaPublicMatch";
import { isApiEnabled } from "../../config/apiFlags";
import { LIVE_DATA_CONTRACT } from "../../lib/liveDataContract";
import { logger } from "../Logger";
import { computeScoreConsensus, type ScoreVote } from "./LiveScoreConsensus";
import { selectPrimaryMatch } from "../PollingEngine";
import { MODULE_IDS } from "../../lib/moduleIds";
import { smartPollIntervalMs } from "../../lib/pollPolicy";

const MAX_DISAGREEMENTS = 3;
const disagreementCounts = new Map<string, number>();
const pendingConsensusCounts = new Map<string, { signature: string; seen: number; lastSeenAt: number }>();

function secondaryScoreVotesEnabled(): boolean {
  return (
    LIVE_DATA_CONTRACT.enableWcLiveScoreVotes ||
    LIVE_DATA_CONTRACT.enableSportApiScoreVotes ||
    LIVE_DATA_CONTRACT.enableFifaPublicScoreVotes
  );
}

async function collectAllVotes(
  merged: Record<string, MergedMatch>,
  teams: Record<string, import("../../types").Team>,
  espnMatches: import("../../types").Match[],
  lockedMatchIds: Record<string, true> = {}
): Promise<Map<string, ScoreVote[]>> {
  const byMatch = new Map<string, ScoreVote[]>();

  const wcPromise = LIVE_DATA_CONTRACT.enableWcLiveScoreVotes
    ? fetchWcLive().then((wcMatches) => {
        const map = new Map<string, ScoreVote[]>();
        for (const raw of wcMatches) {
          const partial = normalizeWCLiveMatch(raw);
          if (partial.homeScore === undefined || partial.awayScore === undefined) continue;
          const homeLabel = String(raw.homeTeam ?? "");
          const awayLabel = String(raw.awayTeam ?? "");
          const storeMatch = findStoreMatchForExternalVote(
            merged,
            { matchId: String(raw.matchId ?? raw.id ?? ""), homeLabel, awayLabel },
            teams
          );
          if (!storeMatch) continue;
          if (isProtectedFromEspnOverwrite(storeMatch, lockedMatchIds, storeMatch.id)) continue;
          const vote: ScoreVote = {
            source: "wclive",
            matchId: storeMatch.id,
            homeScore: partial.homeScore,
            awayScore: partial.awayScore,
            timestamp: Date.now(),
          };
          const list = map.get(storeMatch.id) ?? [];
          list.push(vote);
          map.set(storeMatch.id, list);
        }
        return map;
      })
    : Promise.resolve(new Map<string, ScoreVote[]>());

  const sportApiPromise = LIVE_DATA_CONTRACT.enableSportApiScoreVotes
    ? fetchSportApiLive()
    : Promise.resolve([]);

  const fifaPromise =
    LIVE_DATA_CONTRACT.enableFifaPublicScoreVotes &&
    isApiEnabled("fifaPublicApi") &&
    !isFifaPublicDisabled()
      ? fetchWc2026Live()
      : Promise.resolve([]);

  const [wcMap, sportApiEvents, fifaLive] = await Promise.all([
    wcPromise,
    sportApiPromise,
    fifaPromise,
  ]);

  for (const [id, votes] of wcMap) {
    byMatch.set(id, votes);
  }

  for (const m of espnMatches) {
    if (m.status !== "live" && m.status !== "completed") continue;
    if (m.homeScore === undefined || m.awayScore === undefined) continue;

    const storeMatch = merged[m.id] ?? Object.values(merged).find((x) => x.espnEventId === m.id);
    if (!storeMatch || isProtectedFromEspnOverwrite(storeMatch, lockedMatchIds, storeMatch.id)) continue;

    const vote: ScoreVote = {
      source: "espn",
      matchId: storeMatch.id,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      clockMinute: m.clockMinute,
      timestamp: Date.now(),
    };
    const list = byMatch.get(storeMatch.id) ?? [];
    list.push(vote);
    byMatch.set(storeMatch.id, list);
  }

  for (const partial of sportApiEvents) {
    if (partial.homeScore === undefined || partial.awayScore === undefined) continue;
    const storeMatch = findStoreMatchForExternalVote(
      merged,
      {
        matchId: partial.id ?? "",
        homeLabel: partial.homeTeamId ?? "",
        awayLabel: partial.awayTeamId ?? "",
        kickoffMs: partial.date ? Date.parse(partial.date) : undefined,
      },
      teams
    );
    if (!storeMatch) continue;
    if (isProtectedFromEspnOverwrite(storeMatch, lockedMatchIds, storeMatch.id)) continue;

    const vote: ScoreVote = {
      source: "sportapi7",
      matchId: storeMatch.id,
      homeScore: partial.homeScore,
      awayScore: partial.awayScore,
      timestamp: Date.now(),
    };
    const list = byMatch.get(storeMatch.id) ?? [];
    list.push(vote);
    byMatch.set(storeMatch.id, list);
  }

  for (const raw of fifaLive) {
    if (raw.status !== "live") continue;
    const partial = normalizeFifaPublicLiveMatch(raw);
    if (partial.homeScore === undefined || partial.awayScore === undefined) continue;
    const storeKey = partial.id ?? (raw.matchNumber != null ? `M${raw.matchNumber}` : undefined);
    if (!storeKey || !merged[storeKey]) continue;
    if (isProtectedFromEspnOverwrite(merged[storeKey], lockedMatchIds, storeKey)) continue;

    const vote: ScoreVote = {
      source: "fifaPublic",
      matchId: storeKey,
      homeScore: partial.homeScore,
      awayScore: partial.awayScore,
      timestamp: Date.now(),
    };
    const list = byMatch.get(storeKey) ?? [];
    list.push(vote);
    byMatch.set(storeKey, list);
  }

  return byMatch;
}

function applyConsensusToMatch(
  merged: Record<string, MergedMatch>,
  storeKey: string,
  votes: ScoreVote[],
  lockedMatchIds: Record<string, true> = {}
): void {
  const existing = merged[storeKey];
  if (isProtectedFromEspnOverwrite(existing, lockedMatchIds, storeKey)) return;

  const consensus = computeScoreConsensus(votes);

  if (consensus.agreed) {
    disagreementCounts.delete(storeKey);
    const signature = `${consensus.homeScore}:${consensus.awayScore}`;
    const uniqueSources = new Set(consensus.sources).size;
    if (uniqueSources < 3) {
      const existingPending = pendingConsensusCounts.get(storeKey);
      const seen =
        existingPending && existingPending.signature === signature
          ? existingPending.seen + 1
          : 1;
      pendingConsensusCounts.set(storeKey, {
        signature,
        seen,
        lastSeenAt: Date.now(),
      });
      if (seen < 2) return;
    } else {
      pendingConsensusCounts.delete(storeKey);
    }
    merged[storeKey] = applySecondaryScorePatch(existing, {
      homeScore: consensus.homeScore,
      awayScore: consensus.awayScore,
    });
    return;
  }

  const count = (disagreementCounts.get(storeKey) ?? 0) + 1;
  disagreementCounts.set(storeKey, count);
  pendingConsensusCounts.delete(storeKey);

  if (count >= MAX_DISAGREEMENTS) {
    const wclive = votes.find((v) => v.source === "wclive");
    if (wclive) {
      merged[storeKey] = applySecondaryScorePatch(existing, {
        homeScore: wclive.homeScore,
        awayScore: wclive.awayScore,
      });
      logger.warn("Consensus fallback to wclive (score only)", "DataOrchestrator.live", {
        matchId: storeKey,
      });
    }
    disagreementCounts.delete(storeKey);
  }
}

function prunePendingConsensus(): void {
  const now = Date.now();
  for (const [matchId, pending] of pendingConsensusCounts) {
    if (now - pending.lastSeenAt > 180_000) {
      pendingConsensusCounts.delete(matchId);
    }
  }
}

function refreshStandingsAndSimulation(
  merged: Record<string, MergedMatch>,
  options: { scheduleSimulationRun: boolean }
): void {
  const store = useStore.getState();
  const teamsList = Object.values(store.teams);
  if (teamsList.length === 0) return;

  const matchList = Object.values(merged);
  const derived = deriveStandingsIfScored(matchList, teamsList);
  const next = mergeStandingsPartials(
    readStandingsCache() ?? [],
    store.groupStandings,
    derived ?? []
  );

  if (next.length > 0 && !standingsEqual(next, store.groupStandings)) {
    store.setGroupStandings(next);
    writeStandingsCache(next);
  }
  if (options.scheduleSimulationRun) {
    scheduleSimulation();
  }
}

/** Live poll tick: consensus scores + enrichment cascade (light = ESPN only when idle). */
export async function runLiveTick(options?: { light?: boolean }): Promise<number> {
  prunePendingConsensus();
  const store = useStore.getState();
  let merged: Record<string, MergedMatch> = { ...store.liveMatches };
  const teams = store.teams;

  const espn = await fetchScoreboard({ intent: "live" });

  for (const m of espn.matches) {
    const incoming = applyLiveScore(undefined, { ...m, espnEventId: m.id }, "espn");
    mergeEspnMatchIntoStore(merged, incoming, teams, {
      lockedMatchIds: store.lockedMatchIds,
    });

    const detailEvents = espn.eventsByMatchId[m.id];
    const storeMatch = merged[m.id] ?? Object.values(merged).find((x) => x.espnEventId === m.id);
    if (detailEvents?.length && storeMatch) {
      publishMatchEvents(storeMatch, detailEvents);
    }
  }

  reconcileEspnLiveAuthority(merged, espn.matches, teams);

  const liveMatches = Object.values(merged).filter((m) => m.status === "live");

  if (!options?.light) {
    const primaryId = store.primaryLiveMatchId;
    const primaryMatch =
      (primaryId ? liveMatches.find((m) => m.id === primaryId) : undefined) ?? liveMatches[0];
    const otherLive = primaryMatch
      ? liveMatches.filter((m) => m.id !== primaryMatch.id)
      : liveMatches;

    if (primaryMatch) {
      const primaryEvents = await fetchMatchEvents(
        primaryMatch,
        primaryMatch.matchId ?? primaryMatch.id
      );
      publishMatchEvents(primaryMatch, primaryEvents);
    }

    await Promise.allSettled(
      otherLive.map(async (m) => {
        const events = await fetchMatchEvents(m, m.matchId ?? m.id);
        publishMatchEvents(m, events);
      })
    );

    if (secondaryScoreVotesEnabled()) {
      const votesByMatch = await collectAllVotes(merged, teams, espn.matches, store.lockedMatchIds);
      for (const [storeKey, votes] of votesByMatch) {
        if (votes.length > 0) {
          applyConsensusToMatch(merged, storeKey, votes, store.lockedMatchIds);
        }
      }

      reconcileEspnLiveAuthority(merged, espn.matches, teams);
    }

    const { events: enrichmentEvents, source: enrichmentSource } = await fetchEnrichmentEvents();
    const enrichedCount = applyEnrichmentEvents(merged, enrichmentEvents, teams);

    logger.debug(enrichmentSourceLabel(enrichmentSource, enrichedCount), "DataOrchestrator.live", {
      espnCount: espn.matches.length,
      enrichmentEvents: enrichmentEvents.length,
      enrichmentSource,
      enrichedCount,
      light: false,
    });
  } else {
    logger.debug("Light poll — ESPN scoreboard only", "DataOrchestrator.live", {
      espnCount: espn.matches.length,
    });
  }

  reconcileEspnLiveAuthority(merged, espn.matches, teams);

  for (const m of Object.values(merged)) {
    if (m.locked && m.status === "completed") store.addLockedMatchId(m.id);
  }

  const liveCount = Object.values(merged).filter((m) => m.status === "live").length;
  const primary = selectPrimaryMatch(Object.values(merged), store.primaryLiveMatchId);

  merged = enrichMatchesPenaltyShootouts(merged, store.matchEvents);

  if (!options?.light) {
    merged = await enrichKnockoutPenaltiesFromZafronix(merged);
  }

  const previousMatches = store.liveMatches;
  for (const m of Object.values(merged)) {
    const prior = previousMatches[m.id];
    if (m.status === "completed" && prior?.status !== "completed") {
      enqueueKampEnrichmentForCompletedMatch(m, teams);
    }
  }

  store.batchPollUpdate({
    matches: merged,
    lastPollAt: Date.now(),
    consecutiveErrors: 0,
  });

  store.touchModuleFreshness(MODULE_IDS.liveMatches);

  writeLiveMatchCache(useStore.getState().liveMatches);

  if (primary && primary !== store.primaryLiveMatchId) {
    store.setPrimaryMatch(primary);
  }

  refreshStandingsAndSimulation(merged, { scheduleSimulationRun: !options?.light });
  store.touchModuleFreshness(MODULE_IDS.groupStandings);

  const { intervalMs } = smartPollIntervalMs(Object.values(merged));

  if (typeof window !== "undefined") {
    window.__pollingStatus = {
      running: true,
      liveMatchCount: liveCount,
      intervalMs,
      lastPollAt: Date.now(),
      consecutiveErrors: 0,
    };
  }

  return liveCount;
}
