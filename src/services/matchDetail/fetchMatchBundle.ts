import type { Lineup, MatchEvent, MatchStatisticsBundle, MergedMatch, Team } from "../../types";
import type { WcCommentaryEntry } from "../WorldCup2026LiveClient";
import { isApiEnabled } from "../../config/apiFlags";
import { fetchMatchPlayByPlay } from "../ESPNClient";
import {
  fetchMatchComments,
  fetchMatchLineups,
  fetchMatchStatistics,
} from "../SofaScore6Client";
import {
  fetchMatchLineupsRaw,
  fetchMatchStatisticsRaw,
} from "../SofaScoreRapidClient";
import { TtlCache } from "../cache/TtlCache";
import {
  fetchCommentary,
  fetchLineups,
  fetchMatchDetail,
  fetchStats,
  isWc2026LiveDisabled,
} from "../WorldCup2026LiveClient";
import { mapEventsToCommentary, mapSofaCommentsToCommentary } from "./mapEventsToCommentary";
import { mapEspnPlayByPlayToEvents } from "./mapEspnToEvents";
import { mapSofaMatchLineups } from "./mapSofaMatchLineups";
import { mapSofaMatchStats } from "./mapSofaMatchStats";
import { mapWcLineups } from "./mapWcLineups";
import { mapWcStats } from "./mapWcStats";
import { fetchMatchEvents } from "./fetchMatchEvents";
import { resolveWcLiveApiMatchId } from "./resolveWcLiveMatchId";

const TTL_LIVE_MS = 30_000;
const TTL_FINISHED_MS = 5 * 60_000;

export type MatchBundle = {
  match: MergedMatch;
  wcApiMatchId: string | null;
  matchDetail: Awaited<ReturnType<typeof fetchMatchDetail>>;
  statistics: MatchStatisticsBundle | null;
  lineups: Lineup[];
  commentary: WcCommentaryEntry[];
  events: MatchEvent[];
  fetchedAt: number;
};

const bundleCache = new TtlCache<string, MatchBundle>();

function getTtl(match: MergedMatch): number {
  return match.status === "live" ? TTL_LIVE_MS : TTL_FINISHED_MS;
}

async function loadWcLiveData(
  match: MergedMatch,
  apiMatchId: string | null
): Promise<{
  matchDetail: Awaited<ReturnType<typeof fetchMatchDetail>>;
  statistics: MatchStatisticsBundle | null;
  lineups: Lineup[];
  commentary: WcCommentaryEntry[];
}> {
  if (!apiMatchId || !isApiEnabled("wc2026Live") || isWc2026LiveDisabled()) {
    return { matchDetail: null, statistics: null, lineups: [], commentary: [] };
  }

  const [matchDetail, rawStats, rawLineups, rawCommentary] = await Promise.all([
    fetchMatchDetail(apiMatchId),
    fetchStats(apiMatchId),
    fetchLineups(apiMatchId),
    fetchCommentary(apiMatchId),
  ]);

  return {
    matchDetail,
    statistics: rawStats ? mapWcStats(match.id, rawStats) : null,
    lineups: mapWcLineups(rawLineups),
    commentary: rawCommentary ?? [],
  };
}

async function loadSofaScore6Data(match: MergedMatch): Promise<{
  statistics: MatchStatisticsBundle | null;
  lineups: Lineup[];
  commentary: WcCommentaryEntry[];
}> {
  if (!match.sofaEventId || !isApiEnabled("sofascore")) {
    return { statistics: null, lineups: [], commentary: [] };
  }

  const sofaId = match.sofaEventId;
  const [rawStats, rawLineups, rawComments] = await Promise.all([
    fetchMatchStatistics(sofaId),
    fetchMatchLineups(sofaId),
    fetchMatchComments(sofaId),
  ]);

  return {
    statistics: mapSofaMatchStats(match.id, rawStats),
    lineups: mapSofaMatchLineups(rawLineups),
    commentary: mapSofaCommentsToCommentary(rawComments),
  };
}

async function loadSofaScoreRapidData(match: MergedMatch): Promise<{
  statistics: MatchStatisticsBundle | null;
  lineups: Lineup[];
}> {
  if (!match.sofaEventId || !isApiEnabled("sofascoreRapid")) {
    return { statistics: null, lineups: [] };
  }

  const sofaId = match.sofaEventId;
  const [rawStats, rawLineups] = await Promise.all([
    fetchMatchStatisticsRaw(sofaId),
    fetchMatchLineupsRaw(sofaId),
  ]);

  return {
    statistics: mapSofaMatchStats(match.id, rawStats),
    lineups: mapSofaMatchLineups(rawLineups),
  };
}

async function loadEspnCommentary(
  match: MergedMatch,
  homeTeamId: string,
  awayTeamId: string
): Promise<WcCommentaryEntry[]> {
  if (!match.espnEventId || !isApiEnabled("espnPlayByPlay")) return [];

  try {
    const pbp = await fetchMatchPlayByPlay(match.espnEventId);
    const events = mapEspnPlayByPlayToEvents(pbp, match.espnEventId, homeTeamId, awayTeamId);
    return mapEventsToCommentary(events);
  } catch {
    return [];
  }
}

export async function fetchMatchBundle(
  match: MergedMatch,
  wcMatchId: string | null,
  forceRefresh = false,
  opts?: { homeName?: string; awayName?: string; teams?: Record<string, Team> }
): Promise<MatchBundle> {
  const teams = opts?.teams ?? {};
  const apiMatchId = await resolveWcLiveApiMatchId(match, wcMatchId, teams);
  const cacheKey = `bundle-${match.id}-${apiMatchId ?? "noid"}-${match.sofaEventId ?? "nosofa"}`;

  if (!forceRefresh) {
    const cached = bundleCache.get(cacheKey);
    if (cached) return cached;
  }

  const [wc, sofa6, sofaRapid] = await Promise.all([
    loadWcLiveData(match, apiMatchId),
    loadSofaScore6Data(match),
    loadSofaScoreRapidData(match),
  ]);

  const statistics =
    wc.statistics ??
    sofa6.statistics ??
    sofaRapid.statistics ??
    null;

  const lineups =
    wc.lineups.length > 0
      ? wc.lineups
      : sofa6.lineups.length > 0
        ? sofa6.lineups
        : sofaRapid.lineups;

  let commentary =
    wc.commentary.length > 0
      ? wc.commentary
      : sofa6.commentary.length > 0
        ? sofa6.commentary
        : [];

  if (commentary.length === 0) {
    commentary = await loadEspnCommentary(match, match.homeTeamId, match.awayTeamId);
  }

  const events = await fetchMatchEvents(match, apiMatchId, {
    commentary: wc.commentary,
    homeName: opts?.homeName,
    awayName: opts?.awayName,
  });

  if (commentary.length === 0 && events.length > 0) {
    commentary = mapEventsToCommentary(events);
  }

  const bundle: MatchBundle = {
    match,
    wcApiMatchId: apiMatchId,
    matchDetail: wc.matchDetail,
    statistics,
    lineups,
    commentary,
    events,
    fetchedAt: Date.now(),
  };

  bundleCache.set(cacheKey, bundle, getTtl(match));
  return bundle;
}

export function invalidateMatchBundle(matchId: string, wcMatchId: string | null): void {
  bundleCache.delete(`bundle-${matchId}-${wcMatchId ?? "noid"}`);
}
