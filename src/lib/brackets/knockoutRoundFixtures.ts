import type { Stage } from "../../types";

/**
 * SOLE SOURCE OF TRUTH — FIFA World Cup 2026 knockout progression graph.
 * Derived from `world_cup_2026_knockout_bracket.json`. All code reads from here.
 * DO NOT modify without updating the JSON file to match.
 */
export const KNOCKOUT_ROUND_FIXTURES: Record<
  Exclude<Stage, "R32">,
  Array<[string, string, string]>
> = {
  R16: [
    ["M89", "W74", "W77"],
    ["M90", "W75", "W73"],
    ["M91", "W76", "W78"],
    ["M92", "W79", "W80"],
    ["M93", "W83", "W84"],
    ["M94", "W81", "W82"],
    ["M95", "W86", "W88"],
    ["M96", "W85", "W87"],
  ],
  QF: [
    ["M97", "W89", "W90"],
    ["M98", "W93", "W94"],
    ["M99", "W91", "W92"],
    ["M100", "W95", "W96"],
  ],
  SF: [
    ["M101", "W97", "W98"],
    ["M102", "W99", "W100"],
  ],
  ThirdPlace: [["M103", "L101", "L102"]],
  Final: [["M104", "W101", "W102"]],
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
