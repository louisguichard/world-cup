import { APP_COPY } from "./appCopy";
import type { MergedMatch, Stage } from "../types";

const STAGE_LABELS: Record<Stage, string> = {
  R32: APP_COPY.results.stageR32,
  R16: APP_COPY.results.stageR16,
  QF: APP_COPY.results.stageQF,
  SF: APP_COPY.results.stageSF,
  Final: APP_COPY.results.stageFinal
};

export function matchStageLabel(match: Pick<MergedMatch, "stage" | "group">): string | undefined {
  if (match.stage) return STAGE_LABELS[match.stage];
  if (match.group) return `Group ${match.group}`;
  return undefined;
}
