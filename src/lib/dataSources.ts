import type { DataLoadResult, GroupLetter, Match, OutcomeProbabilities, PolymarketMatchMarket, Team } from "../types";
import { buildPrediction, makeFallbackPrediction, normalizeProbabilities } from "./predictions";
import { normalizeName, pairKey } from "./normalize";
import { addModelRatings, calibrateRatingsToTitleMarket, type FifaRanking, type MatchMarket, type RatingMarket } from "./ratings";
import { simulateTournamentOutcomes } from "./tournament";

const ESPN_SCOREBOARD_PATH =
  "/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";
const POLYMARKET_WINNER_PATH = "/events/slug/world-cup-winner";
const FIFA_RANKINGS_PATH = "/api/v3/rankings?gender=1&count=211&locale=en";
const TITLE_FORCE_CALIBRATION_ITERATIONS = 3000;
const TITLE_FORCE_CALIBRATION_SEED = 20260624;
const POLYMARKET_GAMES_PATHS = Array.from({ length: 8 }, (_, index) => index * 100).map(
  (offset) =>
    `/events?tag_slug=games&active=true&closed=false&limit=100&offset=${offset}&end_date_min=2026-06-11T00:00:00Z&end_date_max=2026-07-20T23:59:00Z`
);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function proxied(path: string, service: "espn" | "poly" | "fifa" | "fifa-api"): string {
  if (!isBrowser()) {
    if (service === "espn") return `https://site.api.espn.com${path}`;
    if (service === "poly") return `https://gamma-api.polymarket.com${path}`;
    if (service === "fifa-api") return `https://www.fifa.com${path}`;
    return `https://inside.fifa.com${path}`;
  }

  if (service === "espn") return `/espn${path}`;
  if (service === "poly") return `/poly${path}`;
  if (service === "fifa-api") return `/fifa-api${path}`;
  return `/fifa${path}`;
}

async function fetchJson<T>(path: string, service: "espn" | "poly" | "fifa" | "fifa-api"): Promise<T> {
  const primary = proxied(path, service);
  const direct =
    service === "espn"
      ? `https://site.api.espn.com${path}`
      : service === "poly"
        ? `https://gamma-api.polymarket.com${path}`
        : service === "fifa-api"
          ? `https://www.fifa.com${path}`
          : `https://inside.fifa.com${path}`;
  const urls = primary === direct ? [direct] : [primary, direct];
  const headers: HeadersInit =
    service === "fifa-api" ? { Accept: "application/json" } : { Accept: "application/json" };
  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Fetch failed");
}

function parsePrice(raw: unknown): number | undefined {
  if (!raw) return undefined;
  const values = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw) : undefined;
  const price = Number(values?.[0]);
  return Number.isFinite(price) ? price : undefined;
}

function parseArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function groupFromNote(note?: string): GroupLetter | undefined {
  const match = note?.match(/Group ([A-L])/);
  return match?.[1] as GroupLetter | undefined;
}

function conductDelta(detail: any): number {
  const text = String(detail?.type?.text ?? "").toLowerCase();
  if (text.includes("yellow") && text.includes("red")) return -5;
  if (text.includes("second") && text.includes("yellow")) return -3;
  if (text.includes("red")) return -4;
  if (text.includes("yellow")) return -1;
  return 0;
}

function parseConduct(details: any[] | undefined): Record<string, number> {
  const conduct: Record<string, number> = {};

  for (const detail of details ?? []) {
    const delta = conductDelta(detail);
    if (!delta) continue;

    const teamId = detail?.team?.id ?? detail?.athletesInvolved?.[0]?.team?.id;
    if (teamId) {
      conduct[teamId] = (conduct[teamId] ?? 0) + delta;
    }
  }

  return conduct;
}

function parseEspnScoreboard(scoreboard: any): { teams: Team[]; matches: Match[] } {
  const teams = new Map<string, Team>();
  const matches: Match[] = [];

  for (const event of scoreboard?.events ?? []) {
    const competition = event?.competitions?.[0];
    const group = groupFromNote(competition?.altGameNote);
    if (!competition || !group) {
      continue;
    }

    const competitors = competition.competitors ?? [];
    const home = competitors.find((competitor: any) => competitor.homeAway === "home");
    const away = competitors.find((competitor: any) => competitor.homeAway === "away");

    if (!home?.team || !away?.team) {
      continue;
    }

    for (const competitor of [home, away]) {
      const sourceTeam = competitor.team;
      if (!teams.has(sourceTeam.id)) {
        teams.set(sourceTeam.id, {
          id: sourceTeam.id,
          name: sourceTeam.displayName,
          shortName: sourceTeam.shortDisplayName ?? sourceTeam.displayName,
          abbreviation: sourceTeam.abbreviation,
          group,
          logo: sourceTeam.logo,
          color: sourceTeam.color,
          alternateColor: sourceTeam.alternateColor,
          rating: 1375
        });
      }
    }

    const statusType = competition.status?.type;
    const state = statusType?.state;
    const status = statusType?.completed ? "completed" : state === "in" ? "live" : "scheduled";
    const hasRealScore = status === "completed" || status === "live";
    const conduct = parseConduct(competition.details);

    matches.push({
      id: String(event.id),
      group,
      date: competition.date ?? event.date,
      venue: competition.venue?.fullName,
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      status,
      homeScore: hasRealScore ? Number(home.score) : undefined,
      awayScore: hasRealScore ? Number(away.score) : undefined,
      homeConduct: conduct[home.team.id] ?? 0,
      awayConduct: conduct[away.team.id] ?? 0,
      locked: hasRealScore,
      source: "espn"
    });
  }

  return {
    teams: [...teams.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)),
    matches: matches.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  };
}

async function loadTitleProbabilities(): Promise<Record<string, number>> {
  const event = await fetchJson<any>(POLYMARKET_WINNER_PATH, "poly");
  const probabilities: Record<string, number> = {};

  for (const market of event?.markets ?? []) {
    const name = market?.groupItemTitle;
    const price = parsePrice(market?.outcomePrices);
    if (name && typeof price === "number") {
      probabilities[normalizeName(name)] = price;
    }
  }

  return probabilities;
}

async function loadFifaRankings(): Promise<Record<string, FifaRanking>> {
  const response = await fetchJson<any>(FIFA_RANKINGS_PATH, "fifa-api");
  const rankings: Record<string, FifaRanking> = {};

  for (const item of response?.Results ?? []) {
    const name = item?.TeamName?.[0]?.Description;
    const rank = Number(item?.Rank);
    const points = Number(item?.DecimalTotalPoints ?? item?.TotalPoints);
    if (name && Number.isFinite(rank) && Number.isFinite(points)) {
      rankings[normalizeName(name)] = { rank, points };
    }
  }

  return rankings;
}

async function loadPolymarketGames(): Promise<any[]> {
  const pages = await Promise.all(
    POLYMARKET_GAMES_PATHS.map(async (path) => {
      try {
        return await fetchJson<any[]>(path, "poly");
      } catch {
        return [];
      }
    })
  );

  const bySlug = new Map<string, any>();
  for (const event of pages.flat()) {
    if ((event?.seriesSlug === "soccer-fifwc" || String(event?.slug ?? "").includes("fifwc")) && event?.teams?.length >= 2) {
      bySlug.set(event.slug, event);
    }
  }

  return [...bySlug.values()];
}

function eventPairKey(event: any): string | undefined {
  const teams = event?.teams;
  if (!Array.isArray(teams) || teams.length < 2) return undefined;
  return pairKey(teams[0].name, teams[1].name);
}

function buildMarketIndex(markets: PolymarketMatchMarket[]): Map<string, PolymarketMatchMarket[]> {
  const index = new Map<string, PolymarketMatchMarket[]>();

  for (const market of markets) {
    const key = pairKey(market.teamAKey, market.teamBKey);
    if (!key) continue;
    const bucket = index.get(key) ?? [];
    bucket.push(market);
    index.set(key, bucket);
  }

  return index;
}

function findMarketForMatch(
  match: Match,
  teamsById: Record<string, Team>,
  marketIndex: Map<string, PolymarketMatchMarket[]>
): PolymarketMatchMarket | undefined {
  const home = teamsById[match.homeTeamId];
  const away = teamsById[match.awayTeamId];
  const candidates = marketIndex.get(pairKey(home.name, away.name)) ?? [];
  const matchTime = Date.parse(match.date);

  return candidates
    .map((market) => ({
      market,
      diff: Math.abs(Date.parse(market.date) - matchTime)
    }))
    .filter(({ diff }) => Number.isFinite(diff) && diff < 36 * 60 * 60 * 1000)
    .sort((a, b) => a.diff - b.diff)[0]?.market;
}

function probabilitiesFromEventKeys(event: any, homeKey: string, awayKey: string): OutcomeProbabilities | undefined {
  const probabilities: Partial<OutcomeProbabilities> = {};

  for (const market of event?.markets ?? []) {
    if (market?.sportsMarketType !== "moneyline") {
      continue;
    }

    const label = String(market?.groupItemTitle ?? market?.question ?? "");
    const price = parsePrice(market?.outcomePrices);
    if (typeof price !== "number") {
      continue;
    }

    if (/draw/i.test(label)) {
      probabilities.draw = price;
      continue;
    }

    const normalized = normalizeName(label);
    if (normalized === homeKey) {
      probabilities.homeWin = price;
    } else if (normalized === awayKey) {
      probabilities.awayWin = price;
    }
  }

  if (
    typeof probabilities.homeWin === "number" &&
    typeof probabilities.draw === "number" &&
    typeof probabilities.awayWin === "number"
  ) {
    return probabilities as OutcomeProbabilities;
  }

  return undefined;
}

function advanceProbabilityFromEventKeys(event: any, teamAKey: string, teamBKey: string): number | undefined {
  for (const market of event?.markets ?? []) {
    const marketType = String(market?.sportsMarketType ?? "").toLowerCase();
    const label = String(market?.groupItemTitle ?? market?.question ?? "").toLowerCase();
    const likelyAdvanceMarket = /qualif|advance|progress|to win|winner|match winner/.test(label) || /qualif|advance|winner/.test(marketType);
    if (!likelyAdvanceMarket) continue;

    const outcomes = parseArray(market?.outcomes).map((outcome) => normalizeName(String(outcome)));
    const prices = parseArray(market?.outcomePrices).map((price) => Number(price));
    const teamAIndex = outcomes.findIndex((outcome) => outcome === teamAKey);
    const teamBIndex = outcomes.findIndex((outcome) => outcome === teamBKey);
    if (teamAIndex >= 0 && teamBIndex >= 0 && Number.isFinite(prices[teamAIndex]) && Number.isFinite(prices[teamBIndex])) {
      const total = prices[teamAIndex] + prices[teamBIndex];
      return total > 0 ? prices[teamAIndex] / total : undefined;
    }
  }

  const teamPrices: Partial<Record<"teamA" | "teamB", number>> = {};
  let hasDraw = false;
  for (const market of event?.markets ?? []) {
    if (market?.sportsMarketType !== "moneyline") continue;
    const label = String(market?.groupItemTitle ?? market?.question ?? "");
    if (/draw/i.test(label)) {
      hasDraw = true;
      continue;
    }
    const price = parsePrice(market?.outcomePrices);
    if (typeof price !== "number") continue;
    const normalized = normalizeName(label);
    if (normalized === teamAKey) teamPrices.teamA = price;
    if (normalized === teamBKey) teamPrices.teamB = price;
  }

  if (!hasDraw && typeof teamPrices.teamA === "number" && typeof teamPrices.teamB === "number") {
    const total = teamPrices.teamA + teamPrices.teamB;
    return total > 0 ? teamPrices.teamA / total : undefined;
  }

  return undefined;
}

function collectPolymarketMatchMarkets(polymarketEvents: any[]): PolymarketMatchMarket[] {
  const markets: PolymarketMatchMarket[] = [];
  const byKey = new Map<string, PolymarketMatchMarket>();

  for (const event of polymarketEvents) {
    const teams = event?.teams;
    if (!Array.isArray(teams) || teams.length < 2) continue;

    const teamAName = String(teams[0]?.name ?? "");
    const teamBName = String(teams[1]?.name ?? "");
    const teamAKey = normalizeName(teamAName);
    const teamBKey = normalizeName(teamBName);
    const date = event.startTime ?? event.eventDate;
    if (!teamAKey || !teamBKey || !date) continue;

    const probabilities = probabilitiesFromEventKeys(event, teamAKey, teamBKey);
    const teamAAdvanceProbability = advanceProbabilityFromEventKeys(event, teamAKey, teamBKey);
    if (!probabilities && typeof teamAAdvanceProbability !== "number") continue;

    const market: PolymarketMatchMarket = {
      teamAKey,
      teamBKey,
      teamAName,
      teamBName,
      date,
      marketSlug: event.slug,
      probabilities,
      teamAAdvanceProbability,
      kind: typeof teamAAdvanceProbability === "number" && !probabilities ? "advance" : "moneyline"
    };
    const key = `${pairKey(teamAKey, teamBKey)}:${Date.parse(date)}:${market.kind}`;
    byKey.set(key, market);
  }

  markets.push(...byKey.values());
  return markets.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function orientedProbabilities(market: PolymarketMatchMarket, home: Team, away: Team): OutcomeProbabilities | undefined {
  if (!market.probabilities) return undefined;

  const homeKey = normalizeName(home.name);
  const awayKey = normalizeName(away.name);
  if (market.teamAKey === homeKey && market.teamBKey === awayKey) {
    return market.probabilities;
  }
  if (market.teamAKey === awayKey && market.teamBKey === homeKey) {
    return {
      homeWin: market.probabilities.awayWin,
      draw: market.probabilities.draw,
      awayWin: market.probabilities.homeWin
    };
  }

  return undefined;
}

function collectMatchMarkets(matches: Match[], teams: Team[], polymarketMarkets: PolymarketMatchMarket[]): Record<string, MatchMarket> {
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const marketIndex = buildMarketIndex(polymarketMarkets);
  const markets: Record<string, MatchMarket> = {};

  for (const match of matches) {
    if (match.locked) {
      continue;
    }

    const home = teamsById[match.homeTeamId];
    const away = teamsById[match.awayTeamId];
    const market = findMarketForMatch(match, teamsById, marketIndex);
    const probabilities = market ? orientedProbabilities(market, home, away) : undefined;

    if (market && probabilities) {
      const normalized = normalizeProbabilities(probabilities);
      markets[match.id] = {
        expectedHome: normalized.homeWin + 0.5 * normalized.draw,
        probabilities,
        marketSlug: market.marketSlug
      };
    }
  }

  return markets;
}

function addPredictions(matches: Match[], teams: Team[], matchMarkets: Record<string, MatchMarket>): Match[] {
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));

  return matches.map((match) => {
    if (match.locked) {
      return match;
    }

    const home = teamsById[match.homeTeamId];
    const away = teamsById[match.awayTeamId];
    const market = matchMarkets[match.id];
    const scoreSeed = `${match.id}-${home.id}-${away.id}`;

    return {
      ...match,
      prediction: market
        ? buildPrediction(market.probabilities as OutcomeProbabilities, "polymarket", market.marketSlug, scoreSeed)
        : makeFallbackPrediction(home, away, scoreSeed)
    };
  });
}

function collectRatingMarkets(
  teams: Team[],
  polymarketMarkets: PolymarketMatchMarket[],
  skippedMarketSlugs: Set<string | undefined>
): RatingMarket[] {
  const teamsByKey = new Map(teams.map((team) => [normalizeName(team.name), team]));
  const ratingMarkets: RatingMarket[] = [];
  const seen = new Set<string>();

  for (const market of polymarketMarkets) {
    if (skippedMarketSlugs.has(market.marketSlug)) continue;

    const teamA = teamsByKey.get(market.teamAKey);
    const teamB = teamsByKey.get(market.teamBKey);
    if (!teamA || !teamB) continue;

    const expectedHome =
      market.probabilities
        ? normalizeProbabilities(market.probabilities).homeWin + 0.5 * normalizeProbabilities(market.probabilities).draw
        : market.teamAAdvanceProbability;

    if (typeof expectedHome !== "number") continue;

    const key = `${market.marketSlug ?? ""}:${teamA.id}:${teamB.id}:${expectedHome.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ratingMarkets.push({
      homeTeamId: teamA.id,
      awayTeamId: teamB.id,
      expectedHome
    });
  }

  return ratingMarkets;
}

export async function loadWorldCupData(): Promise<DataLoadResult> {
  const warnings: string[] = [];
  const scoreboardPromise = fetchJson<any>(ESPN_SCOREBOARD_PATH, "espn");
  const auxiliarySourcesPromise = Promise.allSettled([loadTitleProbabilities(), loadPolymarketGames(), loadFifaRankings()]);

  const [scoreboard, [titleResult, gamesResult, rankingResult]] = await Promise.all([scoreboardPromise, auxiliarySourcesPromise]);
  const parsed = parseEspnScoreboard(scoreboard);

  if (parsed.matches.length !== 72) {
    warnings.push(`ESPN returned ${parsed.matches.length} group-stage matches instead of the expected 72.`);
  }

  const titleProbabilities =
    titleResult.status === "fulfilled"
      ? titleResult.value
      : (() => {
          warnings.push("Could not load the Polymarket outright-winner market.");
          return {};
        })();
  const games =
    gamesResult.status === "fulfilled"
      ? gamesResult.value
      : (() => {
          warnings.push("Could not load Polymarket per-match markets.");
          return [];
        })();
  const fifaRankings =
    rankingResult.status === "fulfilled"
      ? rankingResult.value
      : (() => {
          warnings.push("Could not load the official FIFA ranking; falling back to the strength index.");
          return {};
        })();

  const polymarketMarkets = collectPolymarketMatchMarkets(games);
  const matchMarkets = collectMatchMarkets(parsed.matches, parsed.teams, polymarketMarkets);
  const usedGroupMarketSlugs = new Set(Object.values(matchMarkets).map((market) => market.marketSlug));
  const ratingMarkets = collectRatingMarkets(parsed.teams, polymarketMarkets, usedGroupMarketSlugs);
  const initialTeams = addModelRatings(parsed.teams, parsed.matches, matchMarkets, ratingMarkets, titleProbabilities, fifaRankings);
  const initialMatches = addPredictions(parsed.matches, initialTeams, matchMarkets);
  const rawCalibrationOdds = simulateTournamentOutcomes(
    initialTeams,
    initialMatches,
    polymarketMarkets,
    TITLE_FORCE_CALIBRATION_ITERATIONS,
    TITLE_FORCE_CALIBRATION_SEED
  ).championOdds;
  const teams = calibrateRatingsToTitleMarket(initialTeams, rawCalibrationOdds);
  const matches = addPredictions(parsed.matches, teams, matchMarkets);
  const polymarketPredictions = Object.keys(matchMarkets).length;

  if (polymarketPredictions === 0) {
    warnings.push("No usable Polymarket per-match market; predictions rely on the FIFA-adjusted strength model only.");
  }

  return {
    teams,
    matches,
    knockoutMarkets: polymarketMarkets,
    loadedAt: new Date().toISOString(),
    sources: {
      espn: true,
      polymarketGames: games.length > 0,
      polymarketWinner: Object.keys(titleProbabilities).length > 0,
      fifaRankings: Object.keys(fifaRankings).length > 0
    },
    warnings
  };
}
