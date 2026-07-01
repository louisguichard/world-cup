import { BRACKET_FEED_MAP } from "../bracketTree";
import { knockoutSchedule } from "../../data/knockoutSchedule";
import { R32_VISUAL_ORDER } from "./bracketProgression";
import type { BracketMatch, Stage } from "../../types";

/**
 * Canonical R32 column order: each R16 feeder pair is adjacent (no crossed connectors).
 * Derived from BRACKET_PROGRESSION feeder groupings.
 */
export { R32_VISUAL_ORDER };

const LATER_STAGES: Stage[] = ["R16", "QF", "SF", "ThirdPlace", "Final"];

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

export function kickoffMsForBracketMatch(matchId: string): number {
  const iso = knockoutSchedule[matchId]?.date;
  if (!iso) return Number.POSITIVE_INFINITY;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/** Chronological kickoff order — independent of bracket-tree slot position. */
export function sortBracketMatchesByDate(matches: BracketMatch[]): BracketMatch[] {
  return [...matches].sort((a, b) => {
    const da = kickoffMsForBracketMatch(a.id);
    const db = kickoffMsForBracketMatch(b.id);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
}

export function sortBracketMatchesByVisualOrder(
  matches: BracketMatch[],
  visualIndex: Map<string, number>
): BracketMatch[] {
  return [...matches].sort((a, b) => {
    const ia = visualIndex.get(a.id) ?? 0;
    const ib = visualIndex.get(b.id) ?? 0;
    if (ia !== ib) return ia - ib;
    return kickoffMsForBracketMatch(a.id) - kickoffMsForBracketMatch(b.id);
  });
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
    ThirdPlace: [],
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

/** Flat chronological list across all knockout stages (schedule / vertical view). */
export function flattenBracketByDate(
  bracket: BracketMatch[],
  stages: readonly Stage[] = LATER_STAGES
): BracketMatch[] {
  const allStages: Stage[] = ["R32", ...stages];
  const byStage = orderBracketByStage(bracket);
  const flat: BracketMatch[] = [];
  for (const stage of allStages) {
    flat.push(...sortBracketMatchesByDate(byStage[stage]));
  }
  return sortBracketMatchesByDate(flat);
}
