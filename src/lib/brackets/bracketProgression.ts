import type { Stage } from "../../types";
import { KNOCKOUT_ROUND_FIXTURES } from "./knockoutRoundFixtures";
import { ROUND_OF_32_FIXTURES } from "./getR32Slots";

/** Home/away slot a feeder winner occupies in the downstream match. */
export type BracketSlotSide = "home" | "away";

export type R32AdvanceRule = {
  nextMatch: number;
  slot: BracketSlotSide;
};

export type LaterAdvanceRule = {
  nextMatch: number;
  slot: BracketSlotSide;
};

export type SemiAdvanceRule = {
  winnerNextMatch: number;
  loserNextMatch: number;
  winnerSlot: BracketSlotSide;
  loserSlot: BracketSlotSide;
};

export { ROUND_OF_32_FIXTURES, KNOCKOUT_ROUND_FIXTURES };
export { KNOCKOUT_LATER_STAGES } from "./knockoutRoundFixtures";

/** R32 winner → R16 match number and home/away slot (FIFA schedule M89–M96 feeders). */
export const BRACKET_PROGRESSION_R32_R16: Record<number, R32AdvanceRule> = {
  73: { nextMatch: 89, slot: "home" },
  74: { nextMatch: 89, slot: "away" },
  75: { nextMatch: 90, slot: "home" },
  76: { nextMatch: 90, slot: "away" },
  77: { nextMatch: 91, slot: "home" },
  78: { nextMatch: 91, slot: "away" },
  79: { nextMatch: 92, slot: "home" },
  80: { nextMatch: 92, slot: "away" },
  81: { nextMatch: 93, slot: "home" },
  82: { nextMatch: 93, slot: "away" },
  83: { nextMatch: 94, slot: "home" },
  84: { nextMatch: 94, slot: "away" },
  85: { nextMatch: 95, slot: "home" },
  86: { nextMatch: 95, slot: "away" },
  87: { nextMatch: 96, slot: "home" },
  88: { nextMatch: 96, slot: "away" },
};

/** R16/QF winner → next-round match and slot. */
export const BRACKET_PROGRESSION_LATER: Record<number, LaterAdvanceRule> = {
  89: { nextMatch: 97, slot: "home" },
  90: { nextMatch: 97, slot: "away" },
  91: { nextMatch: 99, slot: "home" },
  92: { nextMatch: 99, slot: "away" },
  93: { nextMatch: 98, slot: "home" },
  94: { nextMatch: 98, slot: "away" },
  95: { nextMatch: 100, slot: "home" },
  96: { nextMatch: 100, slot: "away" },
  97: { nextMatch: 101, slot: "home" },
  98: { nextMatch: 101, slot: "away" },
  99: { nextMatch: 102, slot: "home" },
  100: { nextMatch: 102, slot: "away" },
};

export const BRACKET_PROGRESSION_SEMIS: Record<number, SemiAdvanceRule> = {
  101: {
    winnerNextMatch: 104,
    loserNextMatch: 103,
    winnerSlot: "home",
    loserSlot: "home",
  },
  102: {
    winnerNextMatch: 104,
    loserNextMatch: 103,
    winnerSlot: "away",
    loserSlot: "away",
  },
};

/**
 * R32 column order: each R16 feeder pair adjacent (FIFA schedule M89–M96 feeders).
 */
export const R32_VISUAL_ORDER: string[] = [
  "M73",
  "M74",
  "M75",
  "M76",
  "M77",
  "M78",
  "M79",
  "M80",
  "M81",
  "M82",
  "M83",
  "M84",
  "M85",
  "M86",
  "M87",
  "M88",
];

/** True for legacy `3:1X` or JSON `3X` third-place seed labels. */
export function isThirdPlaceSeed(seed: string): boolean {
  return seed.startsWith("3:") || (seed.length === 2 && seed[0] === "3");
}

/** Returns validation errors when the same seed label appears in more than one R32 slot. */
export function validateR32FixtureSeeds(
  fixtures: ReadonlyArray<readonly [string, string, string]> = ROUND_OF_32_FIXTURES
): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();

  for (const [matchId, homeSeed, awaySeed] of fixtures) {
    for (const seed of [homeSeed, awaySeed]) {
      const prior = seen.get(seed);
      if (prior) {
        errors.push(`Duplicate seed ${seed} in ${prior} and ${matchId}`);
      } else {
        seen.set(seed, matchId);
      }
    }
  }

  return errors;
}
