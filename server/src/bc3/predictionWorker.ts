/**
 * PredictionWorker — BC3 probabilistic forecast engine.
 *
 * Hard invariant: probabilistic forecasts never flow back into BC1 or BC2.
 *
 * Engine: Dixon-Coles adjusted score grid with configurable factor weights.
 * Factor attribution: Shapley-style decomposition of each probability shift.
 *
 * Triggered by:
 * - QualificationChangedEvent (advancement probability recalibration)
 * - EntityUpdatedEvent for form/odds/weather fields
 *
 * Output: versioned PredictionSnapshot rows with per-factor contributions.
 */

import { prisma } from "../infra/prisma.js";
import { redis, cacheKey, cacheSet, CACHE_TTL } from "../infra/redis.js";
import { STREAM_KEYS } from "../events/types.js";
import type {
  QualificationChangedEvent,
  EntityUpdatedEvent,
  PredictionUpdatedEvent,
  FactorContribution,
} from "../events/types.js";

export const PREDICTION_ENGINE_VERSION = "1.0.0";

// ─────────────────────────────────────────────
// Factor model types
// ─────────────────────────────────────────────

export interface TeamStrengthProfile {
  teamId: string;
  attackStrength: number;    // goals scored per game, relative to average
  defenseStrength: number;   // goals conceded per game, relative to average
  eloRating: number;
  recentFormScore: number;   // W=3, D=1, L=0 over last 5 games, normalized 0-1
  fifaRanking: number;
}

export interface MatchPredictionInput {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeProfile: TeamStrengthProfile;
  awayProfile: TeamStrengthProfile;
  homeAdvantage: boolean;
  marketOdds?: { homeWin?: number; draw?: number; awayWin?: number };
  weatherFactor?: number;    // 0-1, 1 = ideal conditions
}

export interface MatchPrediction {
  matchId: string;
  homeWinP: number;
  drawP: number;
  awayWinP: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  factorContributions: FactorContribution[];
  modelVersion: string;
}

// ─────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────

export class PredictionWorker {
  private readonly PROBABILITY_SHIFT_THRESHOLD = 0.02; // only emit event if delta > 2%

  /**
   * Triggered by QualificationChangedEvent.
   * Recalibrates advancement probabilities for all teams in the affected group.
   */
  async processQualificationChanged(event: QualificationChangedEvent): Promise<void> {
    const groupMatches = await prisma.canonicalMatch.findMany({
      where: { groupId: event.groupId, resultLocked: false },
    });

    for (const match of groupMatches) {
      await this.predictMatch(match.id);
    }

    // Recompute team advancement probabilities
    await this.computeAdvancementProbabilities(event.groupId);
  }

  /**
   * Triggered by EntityUpdatedEvent for form/odds/weather.
   * Recalibrates the specific match.
   */
  async processEntityUpdated(event: EntityUpdatedEvent): Promise<void> {
    if (event.entityType !== "match") return;

    const oddsChanged = event.changedFields.includes("odds");
    const formChanged = event.changedFields.includes("recentForm");

    if (oddsChanged || formChanged) {
      await this.predictMatch(event.entityId);
    }
  }

  /**
   * Runs the Dixon-Coles prediction for a single match.
   * Persists the result and emits PredictionUpdatedEvent on significant shifts.
   */
  async predictMatch(matchId: string): Promise<MatchPrediction | null> {
    const match = await prisma.canonicalMatch.findUnique({ where: { id: matchId } });
    if (!match || match.resultLocked) return null;

    const [homeTeam, awayTeam] = await Promise.all([
      prisma.canonicalTeam.findUnique({ where: { id: match.homeTeamId } }),
      prisma.canonicalTeam.findUnique({ where: { id: match.awayTeamId } }),
    ]);
    if (!homeTeam || !awayTeam) return null;

    const homeProfile = buildStrengthProfile(homeTeam);
    const awayProfile = buildStrengthProfile(awayTeam);

    const input: MatchPredictionInput = {
      matchId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeProfile,
      awayProfile,
      homeAdvantage: true,
      marketOdds: match.odds ? (match.odds as Record<string, number>) : undefined,
    };

    const prediction = dixonColes(input);

    // Check previous prediction for meaningful shift
    const previous = await prisma.predictionSnapshot.findFirst({
      where: { matchId, isScenario: false },
      orderBy: { createdAt: "desc" },
    });

    // Persist snapshot (immutable row)
    await prisma.predictionSnapshot.create({
      data: {
        matchId,
        homeWinP: prediction.homeWinP,
        drawP: prediction.drawP,
        awayWinP: prediction.awayWinP,
        modelVersion: PREDICTION_ENGINE_VERSION,
        factorContributions: prediction.factorContributions as object[],
        isScenario: false,
      },
    });

    // Invalidate cache
    await redis.del(cacheKey("prediction", matchId));

    // Emit event only on meaningful probability shifts
    if (previous) {
      const delta = Math.abs(prediction.homeWinP - previous.homeWinP);
      if (delta >= this.PROBABILITY_SHIFT_THRESHOLD) {
        const event: PredictionUpdatedEvent = {
          type: "PredictionUpdatedEvent",
          matchId,
          previousP: previous.homeWinP,
          newP: prediction.homeWinP,
          delta,
          modelVersion: PREDICTION_ENGINE_VERSION,
          topFactors: prediction.factorContributions.slice(0, 3),
          updatedAt: new Date().toISOString(),
        };
        await this.publishEvent(event);
      }
    }

    // Update cache
    await cacheSet(cacheKey("prediction", matchId), prediction, CACHE_TTL.predictions);

    return prediction;
  }

  /**
   * Computes advancement probabilities for all teams in a group
   * via a simplified Monte Carlo simulation (1000 iterations).
   * Scope: group-only; does not simulate the full bracket.
   */
  async computeAdvancementProbabilities(groupId: string): Promise<void> {
    const teams = await prisma.canonicalTeam.findMany({ where: { groupId } });
    const unlockedMatches = await prisma.canonicalMatch.findMany({
      where: { groupId, resultLocked: false },
    });

    if (unlockedMatches.length === 0) return;

    const advancementCounts = new Map<string, number>(
      teams.map((t) => [t.id, 0])
    );

    const ITERATIONS = 1000;

    for (let i = 0; i < ITERATIONS; i++) {
      const simResults = await this.simulateGroup(groupId, unlockedMatches);
      for (const [teamId, advances] of simResults) {
        if (advances) {
          advancementCounts.set(teamId, (advancementCounts.get(teamId) ?? 0) + 1);
        }
      }
    }

    // Persist advancement probabilities
    for (const team of teams) {
      const probability = (advancementCounts.get(team.id) ?? 0) / ITERATIONS;

      await prisma.advancementProbability.create({
        data: {
          teamId: team.id,
          stage: "ROUND_OF_32",
          probability,
          modelVersion: PREDICTION_ENGINE_VERSION,
          isScenario: false,
        },
      });

      // Emit event for significant changes
      const prev = await prisma.advancementProbability.findFirst({
        where: { teamId: team.id, stage: "ROUND_OF_32", isScenario: false },
        orderBy: { createdAt: "desc" },
        skip: 1, // skip the one we just created
      });

      if (prev && Math.abs(prev.probability - probability) >= this.PROBABILITY_SHIFT_THRESHOLD) {
        const event: PredictionUpdatedEvent = {
          type: "PredictionUpdatedEvent",
          teamId: team.id,
          previousP: prev.probability,
          newP: probability,
          delta: Math.abs(prev.probability - probability),
          modelVersion: PREDICTION_ENGINE_VERSION,
          topFactors: [],
          updatedAt: new Date().toISOString(),
        };
        await this.publishEvent(event);
      }
    }
  }

  private async simulateGroup(
    groupId: string,
    unlockedMatches: Array<{ id: string; homeTeamId: string; awayTeamId: string }>
  ): Promise<Map<string, boolean>> {
    const standings = new Map<string, { points: number; gd: number }>();

    // Initialize from locked results
    const teams = await prisma.canonicalTeam.findMany({ where: { groupId } });
    for (const t of teams) standings.set(t.id, { points: 0, gd: 0 });

    const lockedMatches = await prisma.canonicalMatch.findMany({
      where: { groupId, resultLocked: true },
    });

    for (const m of lockedMatches) {
      if (m.homeScore === null || m.awayScore === null) continue;
      updateStandings(standings, m.homeTeamId, m.awayTeamId, m.homeScore, m.awayScore);
    }

    // Simulate unlocked matches
    for (const match of unlockedMatches) {
      const [homeTeam, awayTeam] = await Promise.all([
        prisma.canonicalTeam.findUnique({ where: { id: match.homeTeamId } }),
        prisma.canonicalTeam.findUnique({ where: { id: match.awayTeamId } }),
      ]);
      if (!homeTeam || !awayTeam) continue;

      const homeProfile = buildStrengthProfile(homeTeam);
      const awayProfile = buildStrengthProfile(awayTeam);
      const pred = dixonColes({ matchId: match.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, homeProfile, awayProfile, homeAdvantage: true });

      const r = Math.random();
      if (r < pred.homeWinP) {
        updateStandings(standings, match.homeTeamId, match.awayTeamId, 1, 0);
      } else if (r < pred.homeWinP + pred.drawP) {
        updateStandings(standings, match.homeTeamId, match.awayTeamId, 0, 0);
      } else {
        updateStandings(standings, match.homeTeamId, match.awayTeamId, 0, 1);
      }
    }

    // Top 2 advance
    const sorted = [...standings.entries()].sort((a, b) =>
      b[1].points !== a[1].points ? b[1].points - a[1].points : b[1].gd - a[1].gd
    );

    return new Map(sorted.map(([teamId], idx) => [teamId, idx < 2]));
  }

  private async publishEvent(event: Record<string, unknown>): Promise<void> {
    await redis.xadd(
      STREAM_KEYS.prediction,
      "*",
      "type", String(event.type),
      "payload", JSON.stringify(event)
    );
    await redis.xadd(
      STREAM_KEYS.push,
      "*",
      "type", String(event.type),
      "payload", JSON.stringify(event)
    );
  }
}

// ─────────────────────────────────────────────
// Pure prediction functions (Dixon-Coles model)
// ─────────────────────────────────────────────

const LEAGUE_AVERAGE_GOALS = 1.3;
const HOME_ADVANTAGE = 1.15;

function dixonColes(input: MatchPredictionInput): MatchPrediction {
  const { homeProfile, awayProfile, homeAdvantage, marketOdds } = input;

  let expectedHome =
    homeProfile.attackStrength *
    awayProfile.defenseStrength *
    LEAGUE_AVERAGE_GOALS *
    (homeAdvantage ? HOME_ADVANTAGE : 1.0);

  let expectedAway =
    awayProfile.attackStrength *
    homeProfile.defenseStrength *
    LEAGUE_AVERAGE_GOALS;

  // Blend in market odds if available (calibration signal)
  if (marketOdds?.homeWin && marketOdds?.draw && marketOdds?.awayWin) {
    const impliedHome = 1 / marketOdds.homeWin;
    const impliedAway = 1 / marketOdds.awayWin;
    const calibrationWeight = 0.3;
    expectedHome = expectedHome * (1 - calibrationWeight) + impliedHome * calibrationWeight * 2.5;
    expectedAway = expectedAway * (1 - calibrationWeight) + impliedAway * calibrationWeight * 2.5;
  }

  // Score grid (0-6 goals each)
  const MAX_GOALS = 7;
  let homeWinP = 0;
  let drawP = 0;
  let awayWinP = 0;

  for (let h = 0; h < MAX_GOALS; h++) {
    for (let a = 0; a < MAX_GOALS; a++) {
      const p = poisson(expectedHome, h) * poisson(expectedAway, a) * dixonColesRho(h, a, expectedHome, expectedAway);
      if (h > a) homeWinP += p;
      else if (h === a) drawP += p;
      else awayWinP += p;
    }
  }

  // Normalize to sum to 1
  const total = homeWinP + drawP + awayWinP;
  homeWinP /= total;
  drawP /= total;
  awayWinP /= total;

  // Factor attribution (simplified Shapley-style)
  const factorContributions = computeFactorContributions(
    input,
    homeWinP,
    expectedHome,
    expectedAway
  );

  return {
    matchId: input.matchId,
    homeWinP,
    drawP,
    awayWinP,
    expectedHomeGoals: expectedHome,
    expectedAwayGoals: expectedAway,
    factorContributions,
    modelVersion: PREDICTION_ENGINE_VERSION,
  };
}

function poisson(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function dixonColesRho(h: number, a: number, mu: number, nu: number): number {
  // Dixon-Coles low-score correction factor
  const rho = -0.13; // typical value
  if (h === 0 && a === 0) return 1 - mu * nu * rho;
  if (h === 0 && a === 1) return 1 + mu * rho;
  if (h === 1 && a === 0) return 1 + nu * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

function computeFactorContributions(
  input: MatchPredictionInput,
  homeWinP: number,
  expectedHome: number,
  expectedAway: number
): FactorContribution[] {
  const { homeProfile, awayProfile, marketOdds } = input;

  const contributions: FactorContribution[] = [
    {
      factor: "team_strength",
      contribution: clamp((homeProfile.eloRating - awayProfile.eloRating) / 400, -1, 1),
      direction: homeProfile.eloRating >= awayProfile.eloRating ? "positive" : "negative",
    },
    {
      factor: "recent_form",
      contribution: clamp((homeProfile.recentFormScore - awayProfile.recentFormScore) * 2, -1, 1),
      direction: homeProfile.recentFormScore >= awayProfile.recentFormScore ? "positive" : "negative",
    },
    {
      factor: "home_advantage",
      contribution: input.homeAdvantage ? 0.15 : 0,
      direction: "positive",
    },
    {
      factor: "attack_defense_balance",
      contribution: clamp((expectedHome - expectedAway) / 3, -1, 1),
      direction: expectedHome >= expectedAway ? "positive" : "negative",
    },
  ];

  if (marketOdds?.homeWin) {
    const impliedMarket = 1 / marketOdds.homeWin;
    contributions.push({
      factor: "market_odds",
      contribution: clamp((impliedMarket - homeWinP) * 2, -1, 1),
      direction: impliedMarket >= homeWinP ? "positive" : "negative",
    });
  }

  return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function buildStrengthProfile(team: {
  id: string;
  eloRating: number | null;
  fifaRanking: number | null;
  recentForm: unknown;
}): TeamStrengthProfile {
  const elo = team.eloRating ?? 1500;
  const ranking = team.fifaRanking ?? 50;
  const form = Array.isArray(team.recentForm)
    ? (team.recentForm as string[]).reduce((acc, r) => acc + (r === "W" ? 3 : r === "D" ? 1 : 0), 0) / 15
    : 0.5;

  // Normalize ELO to attack/defense strengths (1.0 = average)
  const eloFactor = Math.pow(10, (elo - 1500) / 800);
  const rankFactor = Math.max(0.7, 1.3 - ranking / 150);

  return {
    teamId: team.id,
    attackStrength: eloFactor * rankFactor,
    defenseStrength: 1 / (eloFactor * rankFactor),
    eloRating: elo,
    recentFormScore: form,
    fifaRanking: ranking,
  };
}

function updateStandings(
  standings: Map<string, { points: number; gd: number }>,
  homeId: string,
  awayId: string,
  homeScore: number,
  awayScore: number
): void {
  const home = standings.get(homeId) ?? { points: 0, gd: 0 };
  const away = standings.get(awayId) ?? { points: 0, gd: 0 };
  const gd = homeScore - awayScore;

  if (homeScore > awayScore) {
    home.points += 3;
  } else if (homeScore === awayScore) {
    home.points += 1;
    away.points += 1;
  } else {
    away.points += 3;
  }

  home.gd += gd;
  away.gd -= gd;
  standings.set(homeId, home);
  standings.set(awayId, away);
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
