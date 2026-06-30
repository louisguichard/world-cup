import { APP_COPY } from "./appCopy";
import { getKnockoutStageLabel } from "./resultsGrouping";
import type { MergedMatch, Stage } from "../types";

const STAGE_LABELS: Record<Stage, string> = {
  R32: APP_COPY.results.stageR32,
  R16: APP_COPY.results.stageR16,
  QF: APP_COPY.results.stageQF,
  SF: APP_COPY.results.stageSF,
  ThirdPlace: APP_COPY.results.stageThirdPlace,
  Final: APP_COPY.results.stageFinal,
};

export function matchStageLabel(match: Pick<MergedMatch, "stage" | "group">): string | undefined {
  if (match.stage) return STAGE_LABELS[match.stage];
  if (match.group) return `Group ${match.group}`;
  return undefined;
}

/** Pill label for completed fixtures — knockout rounds show stage, not generic "Final". */
export function completedMatchPillLabel(match: MergedMatch): string {
  if (match.group) return APP_COPY.match.final;
  const knockout = getKnockoutStageLabel(match);
  return knockout ?? APP_COPY.match.final;
}
