import type { FactorContribution } from "@wc2026/canonical";

export interface FactorInput {
  eloDelta: number;
  formDelta: number;
  homeAdvantage: boolean;
  marketImpliedHome?: number;
  homeWinP: number;
}

/**
 * Post-hoc Shapley-style factor decomposition.
 * Does not modify Dixon-Coles core probabilities.
 */
export function computeFactorContributions(input: FactorInput): FactorContribution[] {
  const factors: FactorContribution[] = [
    {
      factor: "eloStrength",
      contribution: clamp(input.eloDelta / 400, -1, 1),
      direction: input.eloDelta >= 0 ? "positive" : "negative",
    },
    {
      factor: "recentForm",
      contribution: clamp(input.formDelta * 2, -1, 1),
      direction: input.formDelta >= 0 ? "positive" : "negative",
    },
    {
      factor: "homeAdvantage",
      contribution: input.homeAdvantage ? 0.15 : 0,
      direction: "positive",
    },
  ];

  if (input.marketImpliedHome !== undefined) {
    factors.push({
      factor: "oddsImplied",
      contribution: clamp((input.marketImpliedHome - input.homeWinP) * 2, -1, 1),
      direction: input.marketImpliedHome >= input.homeWinP ? "positive" : "negative",
    });
  }

  return factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
