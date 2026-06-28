import type {
  CommentaryEntry,
  Lineup,
  MatchStatisticsBundle,
  MergedMatch,
  OddsSnapshot,
  SourceId,
  TeamFormEntry,
  WeatherSnapshot,
} from "../../types";
import { isApiEnabled } from "../../config/apiFlags";
import { fetchTeamForm } from "../ZafronixClient";
import { getBestLines } from "../OddsIntelligenceClient";
import { getWeatherForLocation } from "../WeatherClient";
import { fetchMatchBundle } from "../matchDetail/fetchMatchBundle";
import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import { materializeFullSchedule } from "../../lib/materializeFullSchedule";
import { logger } from "../Logger";
import { useStore } from "../../store";

export type EnrichmentSource =
  | "commentary"
  | "lineups"
  | "stats"
  | "weather"
  | "odds"
  | "teamForm";

export type EnrichmentJob = {
  matchId: string;
  priority: "high" | "low";
  sources: EnrichmentSource[];
};

export type EnrichmentResult = {
  matchId: string;
  commentary?: CommentaryEntry[];
  lineups?: Lineup[];
  statistics?: MatchStatisticsBundle | null;
  weather?: WeatherSnapshot;
  odds?: OddsSnapshot;
  teamForm?: { home: TeamFormEntry[]; away: TeamFormEntry[] };
  sources: Record<string, SourceId>;
};

const sessionCache = new Map<string, EnrichmentResult>();
const inFlight = new Map<string, Promise<EnrichmentResult>>();

function toCommentaryEntry(
  raw: { minute?: string | number; text: string; type?: string }[]
): CommentaryEntry[] {
  return raw.map((e) => ({
    minute: typeof e.minute === "number" ? e.minute : Number(e.minute) || 0,
    text: e.text,
    type: e.type as CommentaryEntry["type"],
  }));
}

function toWeatherSnapshot(
  data: Awaited<ReturnType<typeof getWeatherForLocation>>
): WeatherSnapshot | undefined {
  if (!data) return undefined;
  return {
    city: data.city,
    tempC: data.tempC,
    tempF: data.tempF,
    condition: data.condition,
    iconKind: data.iconKind,
    icon: data.icon,
    humidity: data.humidity,
    windKph: Math.round(data.windMph * 1.609),
    fetchedAt: Date.now(),
    source: data.source,
  };
}

function toOddsSnapshot(matchId: string, eventId: string): Promise<OddsSnapshot | undefined> {
  return getBestLines(eventId).then((odds) => {
    if (!odds?.bestHome || !odds.bestDraw || !odds.bestAway) return undefined;
    return {
      matchId,
      homeWin: odds.bestHome,
      draw: odds.bestDraw,
      awayWin: odds.bestAway,
      fetchedAt: Date.now(),
    };
  });
}

function zafronixToForm(
  teamName: string,
  matches: Awaited<ReturnType<typeof fetchTeamForm>>
): TeamFormEntry[] {
  return matches.map((m) => {
    const isHome = m.homeTeam.toLowerCase() === teamName.toLowerCase();
    const gf = isHome ? m.homeScore : m.awayScore;
    const ga = isHome ? m.awayScore : m.homeScore;
    const result: TeamFormEntry["result"] = gf > ga ? "W" : gf < ga ? "L" : "D";
    return {
      matchId: String(m.id),
      opponent: isHome ? m.awayTeam : m.homeTeam,
      result,
      goalsFor: gf,
      goalsAgainst: ga,
      date: m.date,
      competition: m.competition,
    };
  });
}

/** Runs enrichment fetches for a match in parallel with per-field fallbacks. */
async function runEnrichment(
  match: MergedMatch,
  wcMatchId: string | null,
  jobSources: EnrichmentSource[]
): Promise<EnrichmentResult> {
  const result: EnrichmentResult = { matchId: match.id, sources: {} };
  const teams = useStore.getState().teams;
  const home = resolveTeamFromStore(teams, match.homeTeamId);
  const away = resolveTeamFromStore(teams, match.awayTeamId);

  const wants = new Set(jobSources);
  const tasks: Promise<void>[] = [];

  if (wants.has("commentary") || wants.has("lineups") || wants.has("stats")) {
    tasks.push(
      fetchMatchBundle(match, wcMatchId, false, {
        teams,
        homeName: home?.name,
        awayName: away?.name,
      }).then((bundle) => {
        if (wants.has("commentary") && bundle.commentary.length > 0) {
          result.commentary = toCommentaryEntry(bundle.commentary);
          result.sources.commentary = "wclive";
        }
        if (wants.has("lineups") && bundle.lineups.length > 0) {
          result.lineups = bundle.lineups;
          result.sources.lineups = "wclive";
        }
        if (wants.has("stats") && bundle.statistics) {
          result.statistics = bundle.statistics;
          result.sources.stats = "wclive";
        }
      }).catch((err) => {
        logger.warn("EnrichmentQueue bundle failed", "EnrichmentQueue", {
          error: err instanceof Error ? err.message : String(err),
        });
      })
    );
  }

  if (wants.has("weather") && (match.venue || match.matchId)) {
    tasks.push(
      getWeatherForLocation({
        matchId: match.matchId,
        venueString: match.venue,
      }).then((wx) => {
        const snap = toWeatherSnapshot(wx);
        if (snap) {
          result.weather = snap;
          result.sources.weather = "wclive";
        }
      })
    );
  }

  if (wants.has("odds") && match.espnEventId && isApiEnabled("oddsIntelligence")) {
    tasks.push(
      toOddsSnapshot(match.id, match.espnEventId).then((odds) => {
        if (odds) {
          result.odds = odds;
          result.sources.odds = "wclive";
        }
      })
    );
  }

  if (wants.has("teamForm") && home && away) {
    tasks.push(
      Promise.all([fetchTeamForm(home.name, 7), fetchTeamForm(away.name, 7)]).then(([h, a]) => {
        result.teamForm = {
          home: zafronixToForm(home.name, h),
          away: zafronixToForm(away.name, a),
        };
        result.sources.teamForm = "zafronix";
      })
    );
  }

  await Promise.allSettled(tasks);
  return result;
}

/** Looks up match in live store, then materialized schedule. */
function resolveMatchForEnrichment(matchId: string): MergedMatch | null {
  const store = useStore.getState();
  const live = store.liveMatches[matchId];
  if (live) return live;

  const fromSchedule = Object.values(store.liveMatches).find(
    (m) => m.matchId === matchId || m.id === matchId
  );
  if (fromSchedule) return fromSchedule;

  const all = materializeFullSchedule(store.teams, store.liveMatches);
  return all.find((m) => m.id === matchId || m.matchId === matchId) ?? null;
}

/** Enqueues lazy enrichment for a match (deduped per session). */
export function enqueue(job: EnrichmentJob): Promise<EnrichmentResult> {
  const cached = sessionCache.get(job.matchId);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(job.matchId);
  if (existing) return existing;

  const match = resolveMatchForEnrichment(job.matchId);
  if (!match) {
    return Promise.resolve({ matchId: job.matchId, sources: {} });
  }

  const wcMatchId = match.matchId ?? match.id;
  const promise = runEnrichment(match, wcMatchId, job.sources).then((result) => {
    sessionCache.set(job.matchId, result);
    inFlight.delete(job.matchId);
    return result;
  });

  inFlight.set(job.matchId, promise);
  return promise;
}

/** Returns cached enrichment result if available. */
export function getResult(matchId: string): EnrichmentResult | null {
  return sessionCache.get(matchId) ?? null;
}

/** Clears session enrichment cache. */
export function clearCache(matchId?: string): void {
  if (matchId) {
    sessionCache.delete(matchId);
    inFlight.delete(matchId);
  } else {
    sessionCache.clear();
    inFlight.clear();
  }
}

/** Default enrichment sources for match detail panel. */
export const DEFAULT_MATCH_ENRICHMENT_SOURCES: EnrichmentSource[] = [
  "commentary",
  "lineups",
  "stats",
  "weather",
  "teamForm",
];
