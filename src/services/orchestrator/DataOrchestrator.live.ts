import type { MergedMatch } from "../../types";
import { deriveStandingsIfScored, standingsEqual } from "../../lib/qualification";
import { writeLiveMatchCache } from "../../lib/liveMatchCache";
import { writeStandingsCache } from "../../lib/standingsCache";
import { useStore } from "../../store";
import { fetchScoreboard } from "../ESPNClient";
import { applyLiveScore } from "../DataMerger";
import {
  applyEnrichmentEvents,
  enrichmentSourceLabel,
  fetchEnrichmentEvents,
} from "../liveEnrichment";
import { mergeEspnMatchIntoStore } from "../espnMatchMerge";
import { findStoreMatchForExternalVote } from "../matchLinking";
import { fetchLive as fetchWcLive } from "../WorldCup2026LiveClient";
import { fetchLiveEvents as fetchSportApiLive } from "../SportAPI7Client";
import { normalizeWCLiveMatch } from "../adapters/normalizeMatch";
import { publishMatchEvents, fetchMatchEvents } from "../matchDetail/fetchMatchEvents";
import { scheduleSimulation } from "../SimulationScheduler";
import { logger } from "../Logger";
import { computeScoreConsensus, type ScoreVote } from "./LiveScoreConsensus";
import { selectPrimaryMatch } from "../PollingEngine";
import { MODULE_IDS } from "../../lib/moduleIds";
import { pollIntervalMs } from "../../lib/pollPolicy";

const MAX_DISAGREEMENTS = 3;
const disagreementCounts = new Map<string, number>();

async function collectAllVotes(
  merged: Record<string, MergedMatch>,
  teams: Record<string, import("../../types").Team>,
  espnMatches: import("../../types").Match[]
): Promise<Map<string, ScoreVote[]>> {
  const byMatch = new Map<string, ScoreVote[]>();

  const [wcMap, sportApiEvents] = await Promise.all([
    fetchWcLive().then((wcMatches) => {
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
        const vote: ScoreVote = {
          source: "wclive",
          matchId: storeMatch.id,
          homeScore: partial.homeScore,
          awayScore: partial.awayScore,
          clockMinute: partial.clockMinute,
          timestamp: Date.now(),
        };
        const list = map.get(storeMatch.id) ?? [];
        list.push(vote);
        map.set(storeMatch.id, list);
      }
      return map;
    }),
    fetchSportApiLive(),
  ]);

  for (const [id, votes] of wcMap) {
    byMatch.set(id, votes);
  }

  for (const m of espnMatches) {
    if (m.status !== "live" && m.status !== "completed") continue;
    if (m.homeScore === undefined || m.awayScore === undefined) continue;

    const storeMatch = merged[m.id] ?? Object.values(merged).find((x) => x.espnEventId === m.id);
    if (!storeMatch) continue;

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

    const vote: ScoreVote = {
      source: "sportapi7",
      matchId: storeMatch.id,
      homeScore: partial.homeScore,
      awayScore: partial.awayScore,
      clockMinute: partial.clockMinute,
      timestamp: Date.now(),
    };
    const list = byMatch.get(storeMatch.id) ?? [];
    list.push(vote);
    byMatch.set(storeMatch.id, list);
  }

  return byMatch;
}

function applyConsensusToMatch(
  merged: Record<string, MergedMatch>,
  storeKey: string,
  votes: ScoreVote[]
): void {
  const existing = merged[storeKey];
  if (!existing || existing.locked) return;

  const consensus = computeScoreConsensus(votes);

  if (consensus.agreed) {
    disagreementCounts.delete(storeKey);
    merged[storeKey] = applyLiveScore(existing, {
      homeScore: consensus.homeScore,
      awayScore: consensus.awayScore,
      clockMinute: consensus.clockMinute,
      status: "live",
      lastUpdatedAt: Date.now(),
    }, "espn");
    return;
  }

  const count = (disagreementCounts.get(storeKey) ?? 0) + 1;
  disagreementCounts.set(storeKey, count);

  if (count >= MAX_DISAGREEMENTS) {
    const wclive = votes.find((v) => v.source === "wclive");
    if (wclive) {
      merged[storeKey] = applyLiveScore(existing, {
        homeScore: wclive.homeScore,
        awayScore: wclive.awayScore,
        clockMinute: wclive.clockMinute,
        status: "live",
        lastUpdatedAt: Date.now(),
      }, "espn");
      logger.warn("Consensus fallback to wclive", "DataOrchestrator.live", { matchId: storeKey });
    }
    disagreementCounts.delete(storeKey);
  }
}

function refreshStandingsAndSimulation(merged: Record<string, MergedMatch>): void {
  const store = useStore.getState();
  const teamsList = Object.values(store.teams);
  if (teamsList.length === 0) return;

  const derived = deriveStandingsIfScored(Object.values(merged), teamsList);
  if (derived && !standingsEqual(derived, store.groupStandings)) {
    store.setGroupStandings(derived);
    writeStandingsCache(derived);
  }
  scheduleSimulation();
}

/** Live poll tick: consensus scores + enrichment cascade (light = ESPN only when idle). */
export async function runLiveTick(options?: { light?: boolean }): Promise<number> {
  const store = useStore.getState();
  let merged: Record<string, MergedMatch> = { ...store.liveMatches };
  const teams = store.teams;

  const espn = await fetchScoreboard();

  for (const m of espn.matches) {
    const incoming = applyLiveScore(undefined, { ...m, espnEventId: m.id }, "espn");
    mergeEspnMatchIntoStore(merged, incoming, teams);

    const detailEvents = espn.eventsByMatchId[m.id];
    const storeMatch = merged[m.id] ?? Object.values(merged).find((x) => x.espnEventId === m.id);
    if (detailEvents?.length && storeMatch) {
      publishMatchEvents(storeMatch, detailEvents);
    }
  }

  const liveMatches = Object.values(merged).filter((m) => m.status === "live" && !m.locked);

  if (!options?.light) {
    await Promise.allSettled(
      liveMatches.slice(0, 6).map(async (m) => {
        const events = await fetchMatchEvents(m, m.matchId ?? m.id);
        publishMatchEvents(m, events);
      })
    );

    const votesByMatch = await collectAllVotes(merged, teams, espn.matches);
    for (const [storeKey, votes] of votesByMatch) {
      if (votes.length > 0) {
        applyConsensusToMatch(merged, storeKey, votes);
      }
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

  for (const m of Object.values(merged)) {
    if (m.locked) store.addLockedMatchId(m.id);
  }

  const liveCount = Object.values(merged).filter((m) => m.status === "live").length;
  const primary = selectPrimaryMatch(Object.values(merged), store.primaryLiveMatchId);

  store.batchPollUpdate({
    matches: merged,
    lastPollAt: Date.now(),
    consecutiveErrors: 0,
  });

  store.touchModuleFreshness(MODULE_IDS.liveMatches);

  writeLiveMatchCache(merged);

  if (primary && primary !== store.primaryLiveMatchId) {
    store.setPrimaryMatch(primary);
  }

  if (!options?.light) {
    refreshStandingsAndSimulation(merged);
    store.touchModuleFreshness(MODULE_IDS.groupStandings);
  }

  const intervalMs = pollIntervalMs(liveCount > 0);

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
