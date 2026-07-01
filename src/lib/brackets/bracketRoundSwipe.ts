import type { Stage } from "../../types";

/** Next/previous stage in the visible knockout sequence (for swipe / keyboard). */
export function resolveAdjacentBracketStage(
  stages: readonly Stage[],
  current: Stage,
  delta: -1 | 1
): Stage | null {
  const index = stages.indexOf(current);
  if (index < 0) return stages[0] ?? null;
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= stages.length) return null;
  return stages[nextIndex] ?? null;
}

export function bracketStageScrollTarget(root: ParentNode, stage: Stage): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-stage="${stage}"]`);
}
