import type { MatchStatisticsBundle, MergedMatch } from "../../types";
import type { HighlightlyMatchBundle } from "../../types/sportHighlights";
import { teamDisplayName } from "../../lib/teamIdentity";
import type { Team } from "../../types";
import { readHighlightIntro } from "../../lib/highlightlyStaticCache";
import { canSpendHighlightlyRequests } from "../../lib/highlightlyQuota";
import {
  fetchHighlightlyHead2Head,
  fetchHighlightlyHighlights,
  fetchHighlightlyLastFiveGames,
  fetchHighlightlyLineups,
  fetchHighlightlyLiveEvents,
  fetchHighlightlyMatch,
  fetchHighlightlyStatistics,
  isSportHighlightsDisabled,
  resolveHighlightlyMatchId,
  resolveHighlightlyTeamId,
} from "../SportHighlightsClient";
import { fetchHighlightIntroForMatch } from "../highlights/fetchHighlightIntro";
import { TtlCache } from "../cache/TtlCache";

const TTL_FINISHED_MS = 24 * 60 * 60_000;

const bundleCache = new TtlCache<string, HighlightlyMatchBundle>();

function cacheKey(match: MergedMatch, homeName: string, awayName: string): string {
  return `${match.id}:${homeName}:${awayName}:${match.date}`;
}

function bundleFromIntro(
  _match: MergedMatch,
  intro: import("../../types/sportHighlights").HighlightlyMatchIntro
): HighlightlyMatchBundle {
  return {
    highlightlyMatchId: intro.highlightlyMatchId,
    matchDetail: null,
    statistics: [],
    highlights: intro.highlights,
    liveEvents: [],
    lineups: null,
    lastFiveHome: [],
    lastFiveAway: [],
    head2Head: [],
    fetchedAt: Date.parse(intro.fetchedAt) || Date.now(),
    intro,
    attribution: intro.attribution,
  };
}

/** Loads Highlightly data — post-match API calls only; static cache for intros. */
export async function fetchHighlightlyMatchBundle(input: {
  match: MergedMatch;
  homeTeam?: Team;
  awayTeam?: Team;
  /** When true, user opened match detail — may spend extra quota on stats/H2H. */
  detailView?: boolean;
}): Promise<HighlightlyMatchBundle> {
  const { match, homeTeam, awayTeam, detailView = false } = input;
  const homeName = teamDisplayName(homeTeam, match.homeTeamId);
  const awayName = teamDisplayName(awayTeam, match.awayTeamId);
  const key = cacheKey(match, homeName, awayName);

  const staticIntro = readHighlightIntro(match.id);
  if (staticIntro) {
    const fromCache = bundleFromIntro(match, staticIntro);
    bundleCache.set(key, fromCache, TTL_FINISHED_MS);
    if (!detailView || match.status !== "completed") {
      return fromCache;
    }
  }

  const cached = bundleCache.get(key);
  if (cached) return cached;

  const baseEmpty: HighlightlyMatchBundle = {
    highlightlyMatchId: null,
    matchDetail: null,
    statistics: [],
    highlights: [],
    liveEvents: [],
    lineups: null,
    lastFiveHome: [],
    lastFiveAway: [],
    head2Head: [],
    fetchedAt: Date.now(),
    intro: staticIntro,
    attribution: staticIntro?.attribution,
  };

  if (isSportHighlightsDisabled()) {
    return baseEmpty;
  }

  if (match.status !== "completed") {
    return {
      ...baseEmpty,
      attribution: "Highlights are fetched after the match ends to save API quota.",
    };
  }

  const intro = staticIntro ?? (await fetchHighlightIntroForMatch({ match, homeTeam, awayTeam }));
  if (intro.highlights.length > 0 && !detailView) {
    const light = bundleFromIntro(match, intro);
    bundleCache.set(key, light, TTL_FINISHED_MS);
    return light;
  }

  if (!detailView || !canSpendHighlightlyRequests(6)) {
    const light = bundleFromIntro(match, intro);
    bundleCache.set(key, light, TTL_FINISHED_MS);
    return light;
  }

  const highlightlyMatchId =
    intro.highlightlyMatchId ??
    (await resolveHighlightlyMatchId({
      homeTeamName: homeName,
      awayTeamName: awayName,
      date: match.date,
    }));

  if (!highlightlyMatchId) {
    bundleCache.set(key, bundleFromIntro(match, intro), TTL_FINISHED_MS);
    return bundleFromIntro(match, intro);
  }

  const [homeTeamId, awayTeamId] = await Promise.all([
    resolveHighlightlyTeamId(homeName),
    resolveHighlightlyTeamId(awayName),
  ]);

  const [
    matchDetail,
    statistics,
    highlights,
    liveEvents,
    lineups,
    lastFiveHome,
    lastFiveAway,
    head2Head,
  ] = await Promise.all([
    fetchHighlightlyMatch(highlightlyMatchId),
    fetchHighlightlyStatistics(highlightlyMatchId),
    intro.highlights.length > 0
      ? Promise.resolve(intro.highlights)
      : fetchHighlightlyHighlights({ matchId: highlightlyMatchId, limit: 20 }),
    fetchHighlightlyLiveEvents(highlightlyMatchId),
    fetchHighlightlyLineups(highlightlyMatchId),
    homeTeamId ? fetchHighlightlyLastFiveGames(homeTeamId) : Promise.resolve([]),
    awayTeamId ? fetchHighlightlyLastFiveGames(awayTeamId) : Promise.resolve([]),
    homeTeamId && awayTeamId
      ? fetchHighlightlyHead2Head(homeTeamId, awayTeamId)
      : Promise.resolve([]),
  ]);

  const bundle: HighlightlyMatchBundle = {
    highlightlyMatchId,
    matchDetail,
    statistics,
    highlights,
    liveEvents,
    lineups,
    lastFiveHome,
    lastFiveAway,
    head2Head,
    fetchedAt: Date.now(),
    intro,
    attribution: intro.attribution,
  };

  bundleCache.set(key, bundle, TTL_FINISHED_MS);
  return bundle;
}

/** Map Highlightly stat rows into app statistics bundle when WC/Sofa feeds are empty. */
export function mapHighlightlyStatistics(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  rows: import("../../types/sportHighlights").HighlightlyTeamStats[]
): MatchStatisticsBundle | null {
  if (rows.length < 2) return null;
  const homeRow = rows.find((r) => r.team?.name) ?? rows[0];
  const awayRow = rows.find((r) => r.team?.id !== homeRow.team?.id) ?? rows[1];
  if (!homeRow || !awayRow) return null;

  const hasStats =
    homeRow.statistics.some((s) => s.value !== "" && s.value != null) ||
    awayRow.statistics.some((s) => s.value !== "" && s.value != null);
  if (!hasStats) return null;

  const toMap = (entries: typeof homeRow.statistics) => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const num = typeof e.value === "number" ? e.value : parseFloat(String(e.value));
      if (!Number.isNaN(num)) map[e.displayName] = num;
    }
    return map;
  };

  const homeMap = toMap(homeRow.statistics);
  const awayMap = toMap(awayRow.statistics);

  const pick = (label: string, key: keyof import("../../types").TeamStats) => ({
    key,
    home: homeMap[label],
    away: awayMap[label],
  });

  const mapped = [
    pick("Ball possession", "ballPossession"),
    pick("Total shots", "totalShots"),
    pick("Shots on target", "shotsOnTarget"),
    pick("Shots accuracy", "passAccuracy"),
    pick("Corner kicks", "corners"),
    pick("Fouls", "fouls"),
    pick("Offsides", "offsides"),
    pick("Yellow cards", "yellowCards"),
  ];

  const home: import("../../types").TeamStats = {};
  const away: import("../../types").TeamStats = {};
  for (const row of mapped) {
    if (row.home !== undefined) home[row.key] = row.home;
    if (row.away !== undefined) away[row.key] = row.away;
  }

  return {
    matchId,
    period: "all",
    home,
    away,
  };
}
