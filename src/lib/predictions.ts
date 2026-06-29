import type { OutcomeProbabilities, Prediction, Team } from "../types";
import { clamp } from "./normalize";

const KNOCKOUT_RATING_SCALE = 500;

type ScoreCell = {
  homeScore: number;
  awayScore: number;
  probability: number;
};

const goalCache = new Map<string, number[]>();
const scoreGridCache = new Map<string, ScoreCell[]>();
const NEGATIVE_BINOMIAL_DISPERSION = 4.2;
const DIXON_COLES_RHO = -0.08;

function cacheKey(lambda: number, maxGoals: number): string {
  return `${lambda.toFixed(3)}:${maxGoals}`;
}

export function normalizeProbabilities(probabilities: OutcomeProbabilities): OutcomeProbabilities {
  const sum = probabilities.homeWin + probabilities.draw + probabilities.awayWin;

  if (!Number.isFinite(sum) || sum <= 0) {
    return { homeWin: 0.36, draw: 0.28, awayWin: 0.36 };
  }

  return {
    homeWin: probabilities.homeWin / sum,
    draw: probabilities.draw / sum,
    awayWin: probabilities.awayWin / sum
  };
}

function negativeBinomialDistribution(lambda: number, maxGoals = 8): number[] {
  const key = cacheKey(lambda, maxGoals);
  const cached = goalCache.get(key);

  if (cached) {
    return cached;
  }

  const values = [];
  const dispersion = NEGATIVE_BINOMIAL_DISPERSION;
  const success = dispersion / (dispersion + Math.max(0.01, lambda));
  let probability = success ** dispersion;
  values.push(probability);

  for (let goals = 1; goals <= maxGoals; goals += 1) {
    probability *= ((goals - 1 + dispersion) / goals) * (1 - success);
    values.push(probability);
  }

  const missing = Math.max(0, 1 - values.reduce((sum, value) => sum + value, 0));
  values[maxGoals] += missing;
  goalCache.set(key, values);
  return values;
}

function dixonColesWeight(homeScore: number, awayScore: number, lambdaHome: number, lambdaAway: number): number {
  if (homeScore === 0 && awayScore === 0) return Math.max(0.2, 1 - lambdaHome * lambdaAway * DIXON_COLES_RHO);
  if (homeScore === 0 && awayScore === 1) return Math.max(0.2, 1 + lambdaHome * DIXON_COLES_RHO);
  if (homeScore === 1 && awayScore === 0) return Math.max(0.2, 1 + lambdaAway * DIXON_COLES_RHO);
  if (homeScore === 1 && awayScore === 1) return Math.max(0.2, 1 - DIXON_COLES_RHO);
  return 1;
}

function scoreGrid(lambdaHome: number, lambdaAway: number, maxGoals = 8): ScoreCell[] {
  const key = `${lambdaHome.toFixed(3)}:${lambdaAway.toFixed(3)}:${maxGoals}`;
  const cached = scoreGridCache.get(key);

  if (cached) {
    return cached;
  }

  const home = negativeBinomialDistribution(lambdaHome, maxGoals);
  const away = negativeBinomialDistribution(lambdaAway, maxGoals);
  const cells: ScoreCell[] = [];
  let total = 0;

  for (let h = 0; h < home.length; h += 1) {
    for (let a = 0; a < away.length; a += 1) {
      const probability = home[h] * away[a] * dixonColesWeight(h, a, lambdaHome, lambdaAway);
      total += probability;
      cells.push({ homeScore: h, awayScore: a, probability });
    }
  }

  const normalized = cells.map((cell) => ({ ...cell, probability: cell.probability / total }));
  scoreGridCache.set(key, normalized);
  return normalized;
}

function outcomeFromLambdas(lambdaHome: number, lambdaAway: number): OutcomeProbabilities {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (const cell of scoreGrid(lambdaHome, lambdaAway)) {
    if (cell.homeScore > cell.awayScore) homeWin += cell.probability;
    else if (cell.homeScore === cell.awayScore) draw += cell.probability;
    else awayWin += cell.probability;
  }

  return normalizeProbabilities({ homeWin, draw, awayWin });
}

const lambdaCache = new Map<string, { lambdaHome: number; lambdaAway: number }>();

export function estimateLambdas(probabilities: OutcomeProbabilities): { lambdaHome: number; lambdaAway: number } {
  const target = normalizeProbabilities(probabilities);
  // The grid search below is a fixed function of the target probabilities, so
  // memoize it — the same match-ups recur across projections, edits and renders.
  const key = `${target.homeWin.toFixed(4)}:${target.draw.toFixed(4)}:${target.awayWin.toFixed(4)}`;
  const cached = lambdaCache.get(key);
  if (cached) return cached;

  let best = { lambdaHome: 1.25, lambdaAway: 1.25, error: Number.POSITIVE_INFINITY };

  for (let home = 0.25; home <= 3.55; home += 0.05) {
    for (let away = 0.25; away <= 3.55; away += 0.05) {
      const actual = outcomeFromLambdas(home, away);
      const error =
        (actual.homeWin - target.homeWin) ** 2 +
        (actual.draw - target.draw) ** 2 +
        (actual.awayWin - target.awayWin) ** 2;

      if (error < best.error) {
        best = { lambdaHome: home, lambdaAway: away, error };
      }
    }
  }

  const result = {
    lambdaHome: Number(best.lambdaHome.toFixed(2)),
    lambdaAway: Number(best.lambdaAway.toFixed(2))
  };
  lambdaCache.set(key, result);
  return result;
}

export function mostLikelyScore(
  lambdaHome: number,
  lambdaAway: number,
  preferredOutcome?: "home" | "draw" | "away"
): { homeScore: number; awayScore: number } {
  let best = { homeScore: 1, awayScore: 1, probability: -1 };

  for (const cell of scoreGrid(lambdaHome, lambdaAway, 7)) {
    if (preferredOutcome === "home" && cell.homeScore <= cell.awayScore) continue;
    if (preferredOutcome === "draw" && cell.homeScore !== cell.awayScore) continue;
    if (preferredOutcome === "away" && cell.homeScore >= cell.awayScore) continue;

    if (cell.probability > best.probability) {
      best = cell;
    }
  }

  return { homeScore: best.homeScore, awayScore: best.awayScore };
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function displayScore(
  lambdaHome: number,
  lambdaAway: number,
  preferredOutcome: "home" | "draw" | "away",
  seed = `${lambdaHome}:${lambdaAway}:${preferredOutcome}`
): { homeScore: number; awayScore: number } {
  const candidates = scoreGrid(lambdaHome, lambdaAway, 7)
    .filter((cell) => {
      if (preferredOutcome === "home") return cell.homeScore > cell.awayScore;
      if (preferredOutcome === "away") return cell.homeScore < cell.awayScore;
      return cell.homeScore === cell.awayScore;
    })
    .filter((cell) => Math.abs(cell.homeScore - cell.awayScore) <= 3 && cell.homeScore + cell.awayScore <= 5)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  if (!candidates.length) {
    return mostLikelyScore(lambdaHome, lambdaAway, preferredOutcome);
  }

  const tempered = candidates.map((cell) => ({ ...cell, weight: cell.probability ** 0.66 }));
  const total = tempered.reduce((sum, cell) => sum + cell.weight, 0);
  let draw = seededUnit(seed) * total;

  for (const cell of tempered) {
    draw -= cell.weight;
    if (draw <= 0) {
      return { homeScore: cell.homeScore, awayScore: cell.awayScore };
    }
  }

  const fallback = tempered[tempered.length - 1];
  return { homeScore: fallback.homeScore, awayScore: fallback.awayScore };
}

export function ratingProbabilities(home: Team, away: Team): OutcomeProbabilities {
  const ratingDiff = home.rating - away.rating;
  const draw = clamp(0.29 - Math.min(Math.abs(ratingDiff), 520) / 5200, 0.17, 0.3);
  const homeShare = 1 / (1 + 10 ** (-ratingDiff / 410));
  const decisive = 1 - draw;

  return normalizeProbabilities({
    homeWin: decisive * homeShare,
    draw,
    awayWin: decisive * (1 - homeShare)
  });
}

export function knockoutWinProbability(home: Team, away: Team): number {
  return clamp(1 / (1 + 10 ** (-(home.rating - away.rating) / KNOCKOUT_RATING_SCALE)), 0.08, 0.92);
}

export function buildPrediction(
  probabilities: OutcomeProbabilities,
  method: Prediction["method"],
  marketSlug?: string,
  scoreSeed?: string
): Prediction {
  const normalized = normalizeProbabilities(probabilities);
  const { lambdaHome, lambdaAway } = estimateLambdas(normalized);
  const maxOutcome =
    normalized.homeWin >= normalized.draw && normalized.homeWin >= normalized.awayWin
      ? "home"
      : normalized.awayWin >= normalized.draw
        ? "away"
        : "draw";
  const score = displayScore(lambdaHome, lambdaAway, maxOutcome, scoreSeed ?? marketSlug);

  return {
    ...normalized,
    lambdaHome,
    lambdaAway,
    predictedHomeScore: score.homeScore,
    predictedAwayScore: score.awayScore,
    method,
    marketSlug
  };
}

export function samplePredictedScore(prediction: Prediction, random: () => number): { homeScore: number; awayScore: number } {
  const draw = random();
  let cumulative = 0;

  for (const cell of scoreGrid(prediction.lambdaHome, prediction.lambdaAway, 8)) {
    cumulative += cell.probability;
    if (draw <= cumulative) {
      return { homeScore: cell.homeScore, awayScore: cell.awayScore };
    }
  }

  return {
    homeScore: prediction.predictedHomeScore,
    awayScore: prediction.predictedAwayScore
  };
}

export function makeFallbackPrediction(home: Team, away: Team, scoreSeed?: string): Prediction {
  return buildPrediction(ratingProbabilities(home, away), "strength-model", undefined, scoreSeed ?? `${home.id}-${away.id}`);
}

export function knockoutScore(home: Team, away: Team, winnerId: string): { homeScore: number; awayScore: number; note?: string } {
  const base = buildPrediction(ratingProbabilities(home, away), "strength-model");
  const preferred = winnerId === home.id ? "home" : "away";
  let score = displayScore(base.lambdaHome, base.lambdaAway, preferred, `${home.id}-${away.id}-${winnerId}`);
  const diff = Math.abs(home.rating - away.rating);

  if (score.homeScore === score.awayScore) {
    score = winnerId === home.id ? { homeScore: 1, awayScore: 0 } : { homeScore: 0, awayScore: 1 };
  }

  if (diff < 30 && Math.abs(score.homeScore - score.awayScore) <= 1) {
    return {
      ...score,
      note: winnerId === home.id ? `${home.shortName} after extra time` : `${away.shortName} after extra time`
    };
  }

  return score;
}
