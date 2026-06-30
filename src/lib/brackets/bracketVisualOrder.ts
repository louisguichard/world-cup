import { BRACKET_FEED_MAP } from "../bracketTree";
import type { BracketMatch, Stage } from "../../types";

/**
 * Canonical R32 column order: each R16 feeder pair is adjacent (no crossed connectors).
 * Derived from KNOCKOUT_ROUND_FIXTURES feeder groupings.
 */
export const R32_VISUAL_ORDER: string[] = [
  "M74",
  "M77",
  "M73",
  "M75",
  "M76",
  "M78",
  "M79",
  "M80",
  "M81",
  "M82",
  "M83",
  "M84",
  "M85",
  "M87",
  "M86",
  "M88",
];

const LATER_STAGES: Stage[] = ["R16", "QF", "SF", "Final"];

/** Visual slot index for a match — R32 from canonical order, later rounds from feeder midpoint. */
export function computeVisualIndex(
  matchId: string,
  feedMap: Record<string, [string, string] | null>,
  visualIndex: Map<string, number>
): number {
  const cached = visualIndex.get(matchId);
  if (cached !== undefined) return cached;

  const feeders = feedMap[matchId];
  if (!feeders) {
    const r32Index = R32_VISUAL_ORDER.indexOf(matchId);
    const index = r32Index >= 0 ? r32Index : 0;
    visualIndex.set(matchId, index);
    return index;
  }

  const ia = computeVisualIndex(feeders[0], feedMap, visualIndex);
  const ib = computeVisualIndex(feeders[1], feedMap, visualIndex);
  const mid = (ia + ib) / 2;
  visualIndex.set(matchId, mid);
  return mid;
}

export function buildBracketVisualIndexMap(
  feedMap: Record<string, [string, string] | null> = BRACKET_FEED_MAP
): Map<string, number> {
  const visualIndex = new Map<string, number>();
  R32_VISUAL_ORDER.forEach((id, i) => visualIndex.set(id, i));

  for (const matchId of Object.keys(feedMap)) {
    if (feedMap[matchId]) {
      computeVisualIndex(matchId, feedMap, visualIndex);
    }
  }

  return visualIndex;
}

export function sortBracketMatchesByVisualOrder(
  matches: BracketMatch[],
  visualIndex: Map<string, number>
): BracketMatch[] {
  return [...matches].sort(
    (a, b) => (visualIndex.get(a.id) ?? 0) - (visualIndex.get(b.id) ?? 0)
  );
}

export function orderBracketByStage(
  bracket: BracketMatch[],
  feedMap: Record<string, [string, string] | null> = BRACKET_FEED_MAP
): Record<Stage, BracketMatch[]> {
  const map: Record<Stage, BracketMatch[]> = {
    R32: [],
    R16: [],
    QF: [],
    SF: [],
    Final: [],
  };

  for (const slot of bracket) {
    map[slot.stage].push(slot);
  }

  const visualIndex = buildBracketVisualIndexMap(feedMap);

  map.R32 = sortBracketMatchesByVisualOrder(map.R32, visualIndex);
  for (const stage of LATER_STAGES) {
    map[stage] = sortBracketMatchesByVisualOrder(map[stage], visualIndex);
  }

  return map;
}
