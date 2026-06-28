import type { FootballPredictionLeague, FootballPredictionMatch } from "../services/FootballPredictionClient";

export type PredictionSourceId = "today" | "boggio";

function normalizeKeyPart(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function matchKey(match: FootballPredictionMatch): string {
  const home = normalizeKeyPart(match.homeTeam);
  const away = normalizeKeyPart(match.awayTeam);
  const date = match.date.slice(0, 10);
  return `${date}|${home}|${away}`;
}

function normalizeTodayPick(prediction: string): string {
  const p = prediction.toUpperCase();
  if (p === "1X2") return "1";
  return p;
}

function picksAlign(a: string, b: string): boolean {
  return normalizeTodayPick(a) === normalizeTodayPick(b);
}

function confidenceScore(match: FootballPredictionMatch): number {
  let score = match.predictionProbability ?? 0;
  if (match.vipTier === "featured") score += 25;
  if (match.vipTier === "scores") score += 20;
  if (match.source === "today") score += 5;
  if (match.sources?.includes("today") && match.sources?.includes("boggio")) score += 15;
  return score;
}

function sourceIds(match: FootballPredictionMatch): PredictionSourceId[] {
  const fromSources = match.sources ?? [];
  const fromSingle = match.source && match.source !== "merged" ? [match.source] : [];
  return [...new Set([...fromSources, ...fromSingle])];
}

function mergePair(
  existing: FootballPredictionMatch,
  incoming: FootballPredictionMatch
): FootballPredictionMatch {
  const sources = new Set<PredictionSourceId>([
    ...sourceIds(existing),
    ...sourceIds(incoming),
  ]);

  const samePick = picksAlign(existing.prediction, incoming.prediction);
  const existingScore = confidenceScore(existing);
  const incomingScore = confidenceScore(incoming);
  const winner = incomingScore > existingScore ? incoming : existing;

  const probs = [existing.predictionProbability, incoming.predictionProbability].filter(
    (p): p is number => p != null
  );
  const avgProb =
    samePick && probs.length > 0
      ? Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 10) / 10
      : winner.predictionProbability;

  return {
    ...winner,
    id: existing.id || incoming.id,
    source: sources.size > 1 ? "merged" : winner.source,
    sources: [...sources],
    predictionProbability: avgProb ?? winner.predictionProbability,
    vipTier: existing.vipTier ?? incoming.vipTier,
    market: existing.market ?? incoming.market,
    federation: existing.federation ?? incoming.federation,
    competitionName: existing.competitionName ?? incoming.competitionName,
  };
}

function ingest(
  map: Map<string, FootballPredictionMatch>,
  match: FootballPredictionMatch
): void {
  const key = matchKey(match);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, match);
    return;
  }
  map.set(key, mergePair(existing, match));
}

/** Merge Today + Boggio pools; VIP picks get priority weighting. */
export function mergeFootballPredictionPools(opts: {
  todayDaily: FootballPredictionMatch[];
  boggioDaily: FootballPredictionMatch[];
  vipFeatured: FootballPredictionMatch[];
  vipScores: FootballPredictionMatch[];
}): FootballPredictionMatch[] {
  const map = new Map<string, FootballPredictionMatch>();

  for (const match of opts.boggioDaily) {
    ingest(map, { ...match, source: match.source ?? "boggio" });
  }
  for (const match of opts.todayDaily) {
    ingest(map, match);
  }
  for (const match of opts.vipFeatured) {
    ingest(map, match);
  }
  for (const match of opts.vipScores) {
    ingest(map, match);
  }

  return [...map.values()].sort((a, b) => confidenceScore(b) - confidenceScore(a));
}

export function mergeFootballLeagues(
  today: FootballPredictionLeague[],
  boggio: FootballPredictionLeague[]
): FootballPredictionLeague[] {
  const seen = new Set<string>();
  const out: FootballPredictionLeague[] = [];
  for (const league of [...today, ...boggio]) {
    const key = `${league.id}:${league.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(league);
  }
  return out;
}
