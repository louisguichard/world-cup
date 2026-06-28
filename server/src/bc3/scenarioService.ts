/**
 * ScenarioService — analyst workspace CRUD + isolated simulation dispatch.
 *
 * Design:
 * - Scenario state lives in Redis (TTL 24h) — ephemeral by default
 * - Analyst can explicitly save a scenario to PredictionStore with isScenario=true
 * - Simulations run in complete isolation: no canonical state is ever mutated
 * - Each simulation is seeded for deterministic replay (Monte Carlo with fixed seed)
 */

import { prisma } from "../infra/prisma.js";
import { redis } from "../infra/redis.js";
import { STREAM_KEYS } from "../events/types.js";
import { PredictionWorker } from "./predictionWorker.js";
import type {
  ScenarioOverride,
  ScenarioCreated,
  ScenarioSimulated,
  FactorContribution,
} from "../events/types.js";

const SCENARIO_TTL_SECONDS = 86_400; // 24 hours

export interface ScenarioWorkspace {
  id: string;
  analystId: string;
  baseSnapshotId: string;
  overrides: ScenarioOverride[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioResult {
  scenarioId: string;
  seed: number;
  iterationsRun: number;
  advancementProbabilities: Record<string, number>;
  factorContributions: Record<string, FactorContribution[]>;
  completedAt: string;
}

export class ScenarioService {
  private predictionWorker = new PredictionWorker();

  // ─────────────────────────────────────────────
  // Workspace CRUD
  // ─────────────────────────────────────────────

  async create(
    analystId: string,
    baseSnapshotId: string,
    overrides: ScenarioOverride[] = [],
    description?: string
  ): Promise<ScenarioWorkspace> {
    const id = `scenario:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const workspace: ScenarioWorkspace = {
      id,
      analystId,
      baseSnapshotId,
      overrides,
      description,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveToRedis(id, workspace);

    const event: ScenarioCreated = {
      type: "ScenarioCreated",
      scenarioId: id,
      analystId,
      baseSnapshotId,
      overrides,
      createdAt: now,
    };
    await this.publishEvent(event);

    return workspace;
  }

  async get(scenarioId: string): Promise<ScenarioWorkspace | null> {
    const raw = await redis.get(scenarioKey(scenarioId));
    if (!raw) return null;
    return JSON.parse(raw) as ScenarioWorkspace;
  }

  async addOverride(
    scenarioId: string,
    override: ScenarioOverride
  ): Promise<ScenarioWorkspace> {
    const workspace = await this.getOrThrow(scenarioId);

    // Replace existing override for the same match, or add new
    const existingIndex = workspace.overrides.findIndex(
      (o) => o.matchId === override.matchId
    );
    if (existingIndex >= 0) {
      workspace.overrides[existingIndex] = override;
    } else {
      workspace.overrides.push(override);
    }

    workspace.updatedAt = new Date().toISOString();
    await this.saveToRedis(scenarioId, workspace);
    return workspace;
  }

  async removeOverride(scenarioId: string, matchId: string): Promise<ScenarioWorkspace> {
    const workspace = await this.getOrThrow(scenarioId);
    workspace.overrides = workspace.overrides.filter((o) => o.matchId !== matchId);
    workspace.updatedAt = new Date().toISOString();
    await this.saveToRedis(scenarioId, workspace);
    return workspace;
  }

  async delete(scenarioId: string): Promise<void> {
    await redis.del(scenarioKey(scenarioId));
    await redis.del(scenarioResultKey(scenarioId));
  }

  // ─────────────────────────────────────────────
  // Simulation
  // ─────────────────────────────────────────────

  /**
   * Runs an isolated Monte Carlo simulation for the scenario.
   * Uses a fixed seed for deterministic replay.
   * NEVER mutates canonical state.
   */
  async simulate(
    scenarioId: string,
    iterations = 1000,
    seed?: number
  ): Promise<ScenarioResult> {
    const workspace = await this.getOrThrow(scenarioId);
    const actualSeed = seed ?? Date.now();

    const rng = seededRng(actualSeed);

    // Load the base snapshot
    const baseSnapshot = await prisma.qualificationSnapshot.findFirst({
      where: { id: workspace.baseSnapshotId },
    });

    // Collect all groups involved in the scenario
    const groupIds = await this.collectAffectedGroups(workspace);

    const advancementCounts = new Map<string, number>();
    const factorSums = new Map<string, FactorContribution[]>();

    for (let i = 0; i < iterations; i++) {
      const result = await this.runSingleIteration(workspace, groupIds, rng);
      for (const [teamId, advances] of result.advancements) {
        if (advances) {
          advancementCounts.set(teamId, (advancementCounts.get(teamId) ?? 0) + 1);
        }
      }
    }

    const advancementProbabilities: Record<string, number> = {};
    for (const [teamId, count] of advancementCounts) {
      advancementProbabilities[teamId] = count / iterations;
    }

    // Compute factor contributions for top drivers
    const factorContributions: Record<string, FactorContribution[]> = {};
    for (const teamId of advancementCounts.keys()) {
      factorContributions[teamId] = await this.computeScenarioFactors(
        teamId,
        workspace,
        advancementProbabilities[teamId] ?? 0
      );
    }

    const result: ScenarioResult = {
      scenarioId,
      seed: actualSeed,
      iterationsRun: iterations,
      advancementProbabilities,
      factorContributions,
      completedAt: new Date().toISOString(),
    };

    // Cache result in Redis
    await redis.set(
      scenarioResultKey(scenarioId),
      JSON.stringify(result),
      "EX",
      SCENARIO_TTL_SECONDS
    );

    const event: ScenarioSimulated = {
      type: "ScenarioSimulated",
      scenarioId,
      seed: actualSeed,
      iterationsRun: iterations,
      advancementProbabilities,
      factorContributions,
      completedAt: result.completedAt,
    };
    await this.publishEvent(event);

    return result;
  }

  async getResult(scenarioId: string): Promise<ScenarioResult | null> {
    const raw = await redis.get(scenarioResultKey(scenarioId));
    if (!raw) return null;
    return JSON.parse(raw) as ScenarioResult;
  }

  /**
   * Persists a scenario result to the PredictionStore for long-term reference.
   * This is the only way scenario data enters persistent storage.
   */
  async saveResult(scenarioId: string): Promise<void> {
    const workspace = await this.getOrThrow(scenarioId);
    const result = await this.getResult(scenarioId);
    if (!result) throw new Error(`No simulation result found for scenario ${scenarioId}`);

    for (const [teamId, probability] of Object.entries(result.advancementProbabilities)) {
      await prisma.advancementProbability.create({
        data: {
          teamId,
          stage: "ROUND_OF_32",
          probability,
          modelVersion: "scenario",
          isScenario: true,
          scenarioId,
        },
      });
    }
  }

  // ─────────────────────────────────────────────
  // Internal simulation helpers
  // ─────────────────────────────────────────────

  private async runSingleIteration(
    workspace: ScenarioWorkspace,
    groupIds: string[],
    rng: () => number
  ): Promise<{ advancements: Map<string, boolean> }> {
    const advancements = new Map<string, boolean>();

    for (const groupId of groupIds) {
      const teams = await prisma.canonicalTeam.findMany({ where: { groupId } });
      const allMatches = await prisma.canonicalMatch.findMany({ where: { groupId } });

      const standings = new Map<string, { points: number; gd: number; gf: number }>(
        teams.map((t) => [t.id, { points: 0, gd: 0, gf: 0 }])
      );

      for (const match of allMatches) {
        // Check if this match has a scenario override
        const override = workspace.overrides.find((o) => o.matchId === match.id);

        let homeScore: number;
        let awayScore: number;

        if (override) {
          homeScore = override.homeScore;
          awayScore = override.awayScore;
        } else if (match.resultLocked && match.homeScore !== null && match.awayScore !== null) {
          homeScore = match.homeScore;
          awayScore = match.awayScore;
        } else {
          // Simulate using prediction model
          const [homeTeam, awayTeam] = await Promise.all([
            prisma.canonicalTeam.findUnique({ where: { id: match.homeTeamId } }),
            prisma.canonicalTeam.findUnique({ where: { id: match.awayTeamId } }),
          ]);
          if (!homeTeam || !awayTeam) continue;

          const mu = simulateGoals(homeTeam, awayTeam, true, rng);
          const nu = simulateGoals(awayTeam, homeTeam, false, rng);
          homeScore = mu;
          awayScore = nu;
        }

        updateStandingsMap(standings, match.homeTeamId, match.awayTeamId, homeScore, awayScore);
      }

      // Top 2 advance from this group
      const sorted = [...standings.entries()].sort(
        (a, b) => b[1].points - a[1].points || b[1].gd - a[1].gd
      );
      sorted.forEach(([teamId], idx) => {
        advancements.set(teamId, idx < 2);
      });
    }

    return { advancements };
  }

  private async collectAffectedGroups(workspace: ScenarioWorkspace): Promise<string[]> {
    const groupIds = new Set<string>();
    for (const override of workspace.overrides) {
      const match = await prisma.canonicalMatch.findUnique({
        where: { id: override.matchId },
      });
      if (match?.groupId) groupIds.add(match.groupId);
    }
    return Array.from(groupIds);
  }

  private async computeScenarioFactors(
    teamId: string,
    workspace: ScenarioWorkspace,
    probability: number
  ): Promise<FactorContribution[]> {
    const overrideCount = workspace.overrides.length;
    return [
      {
        factor: "scenario_overrides",
        contribution: clamp((overrideCount / 6) * 0.5, 0, 1),
        direction: "positive",
      },
      {
        factor: "base_probability",
        contribution: clamp(probability * 2 - 1, -1, 1),
        direction: probability >= 0.5 ? "positive" : "negative",
      },
    ];
  }

  private async saveToRedis(scenarioId: string, workspace: ScenarioWorkspace): Promise<void> {
    await redis.set(
      scenarioKey(scenarioId),
      JSON.stringify(workspace),
      "EX",
      SCENARIO_TTL_SECONDS
    );
  }

  private async getOrThrow(scenarioId: string): Promise<ScenarioWorkspace> {
    const workspace = await this.get(scenarioId);
    if (!workspace) throw new Error(`Scenario not found: ${scenarioId}`);
    return workspace;
  }

  private async publishEvent(event: Record<string, unknown>): Promise<void> {
    await redis.xadd(
      STREAM_KEYS.prediction,
      "*",
      "type", String(event.type),
      "payload", JSON.stringify(event)
    );
  }
}

// ─────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────

function scenarioKey(id: string): string {
  return `wc2026:scenario:${id}:workspace`;
}

function scenarioResultKey(id: string): string {
  return `wc2026:scenario:${id}:result`;
}

/**
 * Seeded LCG pseudo-random number generator for deterministic simulation replay.
 */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

function simulateGoals(
  attacking: { eloRating: number | null },
  defending: { eloRating: number | null },
  home: boolean,
  rng: () => number
): number {
  const atkElo = attacking.eloRating ?? 1500;
  const defElo = defending.eloRating ?? 1500;
  const lambda =
    1.3 *
    Math.pow(10, (atkElo - defElo) / 800) *
    (home ? 1.15 : 1.0);
  return poissonSample(lambda, rng);
}

function poissonSample(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function updateStandingsMap(
  standings: Map<string, { points: number; gd: number; gf: number }>,
  homeId: string,
  awayId: string,
  homeScore: number,
  awayScore: number
): void {
  const home = standings.get(homeId) ?? { points: 0, gd: 0, gf: 0 };
  const away = standings.get(awayId) ?? { points: 0, gd: 0, gf: 0 };

  home.gf += homeScore;
  home.gd += homeScore - awayScore;
  away.gf += awayScore;
  away.gd += awayScore - homeScore;

  if (homeScore > awayScore) home.points += 3;
  else if (homeScore === awayScore) { home.points += 1; away.points += 1; }
  else away.points += 3;

  standings.set(homeId, home);
  standings.set(awayId, away);
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
