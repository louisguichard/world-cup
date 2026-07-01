import type { Stage } from "../../types";
import {
  finalFixtureFromJson,
  qfFixturesFromJson,
  r16FixturesFromJson,
  sfFixturesFromJson,
  thirdPlaceFixtureFromJson,
} from "./knockoutBracketJson";

/**
 * SOLE SOURCE OF TRUTH — FIFA World Cup 2026 knockout progression graph.
 * Derived from `world_cup_2026_knockout_bracket.json` (FIFA schedule M73–M104).
 */
export const KNOCKOUT_ROUND_FIXTURES: Record<
  Exclude<Stage, "R32">,
  Array<[string, string, string]>
> = {
  R16: r16FixturesFromJson(),
  QF: qfFixturesFromJson(),
  SF: sfFixturesFromJson(),
  ThirdPlace: [thirdPlaceFixtureFromJson()],
  Final: [finalFixtureFromJson()],
};

Object.freeze(KNOCKOUT_ROUND_FIXTURES);

/** Knockout rounds after R32, in bracket build order. */
export const KNOCKOUT_LATER_STAGES = [
  "R16",
  "QF",
  "SF",
  "ThirdPlace",
  "Final",
] as const satisfies readonly Stage[];
