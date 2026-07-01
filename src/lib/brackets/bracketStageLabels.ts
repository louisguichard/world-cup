import type { Stage } from "../../types";

/** Short column headers — fits narrow bracket columns without overflow. */
export const BRACKET_STAGE_SHORT_LABELS: Record<Stage, string> = {
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  ThirdPlace: "3rd",
  Final: "Final",
};

export function bracketStageShortLabel(stage: Stage): string {
  return BRACKET_STAGE_SHORT_LABELS[stage];
}
