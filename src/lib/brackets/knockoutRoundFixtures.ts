import type { Stage } from "../../types";

/** Official FIFA WC 2026 knockout progression — feeder winner keys (W73…) per stage. */
export const KNOCKOUT_ROUND_FIXTURES: Record<Exclude<Stage, "R32">, Array<[string, string, string]>> = {
  R16: [
    ["M89", "W73", "W74"],
    ["M90", "W75", "W76"],
    ["M91", "W77", "W78"],
    ["M92", "W79", "W80"],
    ["M93", "W81", "W82"],
    ["M94", "W83", "W84"],
    ["M95", "W85", "W86"],
    ["M96", "W87", "W88"],
  ],
  QF: [
    ["M97", "W89", "W90"],
    ["M98", "W91", "W92"],
    ["M99", "W93", "W94"],
    ["M100", "W95", "W96"],
  ],
  SF: [
    ["M101", "W97", "W98"],
    ["M102", "W99", "W100"],
  ],
  Final: [["M104", "W101", "W102"]],
};
