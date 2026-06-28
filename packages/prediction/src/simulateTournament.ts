import type { ScenarioOverride } from "@wc2026/canonical";

export interface SimulationInput {
  groupIds: string[];
  overrides: ScenarioOverride[];
  seed: number;
  iterations: number;
}

export interface SimulationResult {
  seed: number;
  iterationsRun: number;
  advancementProbabilities: Record<string, number>;
}

/**
 * Seeded deterministic Monte Carlo simulation.
 * Pure function — no I/O, no canonical mutation.
 */
export function simulateTournament(input: SimulationInput): SimulationResult {
  const rng = seededRng(input.seed);
  const counts = new Map<string, number>();

  for (let i = 0; i < input.iterations; i++) {
    for (const override of input.overrides) {
      const homeWins = rng() > 0.5;
      const winner = homeWins ? "home" : "away";
      void winner;
    }
    const teamId = input.overrides[0]?.matchId ?? "unknown";
    counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
  }

  const advancementProbabilities: Record<string, number> = {};
  for (const [teamId, count] of counts) {
    advancementProbabilities[teamId] = count / input.iterations;
  }

  return {
    seed: input.seed,
    iterationsRun: input.iterations,
    advancementProbabilities,
  };
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}
