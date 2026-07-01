import { BRACKET_FEED_MAP } from "../bracketTree";
import { R32_VISUAL_ORDER } from "./bracketProgression";
import type { Stage } from "../../types";

export const SPLIT_BRACKET_METRICS = {
  cardWidth: 196,
  cardHeight: 76,
  colGap: 40,
  rowUnit: 34,
  headerHeight: 32,
  paddingY: 16,
  centerExtraGap: 48,
} as const;

export type BracketHalf = "left" | "right" | "center";

export type SplitBracketNodeLayout = {
  matchId: string;
  stage: Stage;
  half: BracketHalf;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SplitBracketColumnLabel = {
  stage: Stage;
  half: BracketHalf;
  x: number;
  label: string;
};

export type SplitBracketLayout = {
  nodes: Map<string, SplitBracketNodeLayout>;
  width: number;
  height: number;
  columnLabels: SplitBracketColumnLabel[];
};

const LEFT_R32 = R32_VISUAL_ORDER.slice(0, 8);
const RIGHT_R32 = R32_VISUAL_ORDER.slice(8);

const LEFT_STAGE_COL: Partial<Record<Stage, number>> = {
  R32: 0,
  R16: 1,
  QF: 2,
  SF: 3,
};

const RIGHT_STAGE_COL: Partial<Record<Stage, number>> = {
  SF: 5,
  QF: 6,
  R16: 7,
  R32: 8,
};

const CENTER_FINAL_COL = 4;

function colX(col: number): number {
  const { cardWidth, colGap, centerExtraGap } = SPLIT_BRACKET_METRICS;
  if (col <= 3) return col * (cardWidth + colGap);
  if (col === CENTER_FINAL_COL) return 4 * (cardWidth + colGap) + centerExtraGap;
  const rightOffset = 5 * (cardWidth + colGap) + centerExtraGap;
  return rightOffset + (col - 5) * (cardWidth + colGap);
}

export function resolveBracketHalf(matchId: string): BracketHalf {
  if (matchId === "M104" || matchId === "M103") return "center";
  if (matchId === "M101") return "left";
  if (matchId === "M102") return "right";

  const r32Index = R32_VISUAL_ORDER.indexOf(matchId);
  if (r32Index >= 0) return r32Index < 8 ? "left" : "right";

  const feeders = BRACKET_FEED_MAP[matchId];
  if (!feeders) return "center";

  const halfA = resolveBracketHalf(feeders[0]);
  const halfB = resolveBracketHalf(feeders[1]);
  if (halfA === halfB) return halfA;
  return "center";
}

function layoutColumnForMatch(matchId: string, stage: Stage): number {
  const half = resolveBracketHalf(matchId);
  if (half === "center") return CENTER_FINAL_COL;
  if (half === "left") return LEFT_STAGE_COL[stage] ?? 0;
  return RIGHT_STAGE_COL[stage] ?? 8;
}

function computeYPositions(matchIdSet: Set<string>): Map<string, number> {
  const yById = new Map<string, number>();
  const { rowUnit, headerHeight, cardHeight } = SPLIT_BRACKET_METRICS;

  for (const id of LEFT_R32) {
    if (!matchIdSet.has(id)) continue;
    const index = LEFT_R32.indexOf(id);
    yById.set(id, headerHeight + index * 2 * rowUnit);
  }

  for (const id of RIGHT_R32) {
    if (!matchIdSet.has(id)) continue;
    const index = RIGHT_R32.indexOf(id);
    yById.set(id, headerHeight + index * 2 * rowUnit);
  }

  const laterStages: Stage[] = ["R16", "QF", "SF", "Final", "ThirdPlace"];
  for (const stage of laterStages) {
    for (const id of matchIdSet) {
      if (stageFromMatchId(id) !== stage || yById.has(id)) continue;
      const feeders = BRACKET_FEED_MAP[id];
      if (!feeders) continue;

      const yA = yById.get(feeders[0]);
      const yB = yById.get(feeders[1]);
      if (yA === undefined || yB === undefined) continue;
      yById.set(id, (yA + yB) / 2);
    }
  }

  if (matchIdSet.has("M103") && yById.has("M104")) {
    yById.set("M103", yById.get("M104")! + cardHeight + rowUnit);
  }

  return yById;
}

function stageFromMatchId(matchId: string): Stage {
  const num = Number(matchId.replace(/^M/, ""));
  if (num >= 73 && num <= 88) return "R32";
  if (num >= 89 && num <= 96) return "R16";
  if (num >= 97 && num <= 100) return "QF";
  if (num === 101 || num === 102) return "SF";
  if (num === 103) return "ThirdPlace";
  return "Final";
}

export function buildSplitBracketLayout(
  visibleMatchIds: Iterable<string>,
  stageLabels: Record<Stage, string>
): SplitBracketLayout | null {
  const idSet = new Set(
    [...visibleMatchIds].filter((id) => Object.prototype.hasOwnProperty.call(BRACKET_FEED_MAP, id))
  );
  if (idSet.size === 0) return null;

  const yById = computeYPositions(idSet);
  const nodes = new Map<string, SplitBracketNodeLayout>();
  const { cardWidth, cardHeight, paddingY } = SPLIT_BRACKET_METRICS;

  let maxY = 0;

  for (const matchId of idSet) {
    const y = yById.get(matchId);
    if (y === undefined) continue;

    const stage = stageFromMatchId(matchId);
    const half = resolveBracketHalf(matchId);
    const col = layoutColumnForMatch(matchId, stage);
    const x = colX(col);

    nodes.set(matchId, {
      matchId,
      stage,
      half,
      x,
      y,
      width: cardWidth,
      height: cardHeight,
    });

    maxY = Math.max(maxY, y + cardHeight);
  }

  if (nodes.size === 0) return null;

  const height = maxY + paddingY;
  const rightmostCol = Math.max(...[...nodes.values()].map((n) => layoutColumnForMatch(n.matchId, n.stage)));
  const width = colX(rightmostCol) + cardWidth + paddingY;

  const columnLabels: SplitBracketColumnLabel[] = [];
  const seen = new Set<string>();

  for (const node of nodes.values()) {
    const col = layoutColumnForMatch(node.matchId, node.stage);
    const key = `${node.half}:${node.stage}:${col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    columnLabels.push({
      stage: node.stage,
      half: node.half,
      x: node.x,
      label: stageLabels[node.stage] ?? node.stage,
    });
  }

  columnLabels.sort((a, b) => a.x - b.x);

  return { nodes, width, height, columnLabels };
}

/** Connector segment endpoints in canvas coordinates. */
export type SplitBracketConnector = {
  feederId: string;
  childId: string;
  d: string;
};

export function buildSplitBracketConnectors(
  layout: SplitBracketLayout,
  visibleMatchIds: Set<string>
): SplitBracketConnector[] {
  const segments: SplitBracketConnector[] = [];

  for (const [childId, feeders] of Object.entries(BRACKET_FEED_MAP)) {
    if (!feeders || !visibleMatchIds.has(childId)) continue;
    if (!visibleMatchIds.has(feeders[0]) || !visibleMatchIds.has(feeders[1])) continue;

    const child = layout.nodes.get(childId);
    const feederA = layout.nodes.get(feeders[0]);
    const feederB = layout.nodes.get(feeders[1]);
    if (!child || !feederA || !feederB) continue;

    const childCy = child.y + child.height / 2;

    if (childId === "M104") {
      for (const feeder of [feederA, feederB]) {
        const fy = feeder.y + feeder.height / 2;
        if (feeder.matchId === "M101") {
          const fx = feeder.x + feeder.width;
          const cx = child.x;
          const mx = fx + (cx - fx) * 0.55;
          segments.push({
            feederId: feeder.matchId,
            childId,
            d: `M ${fx} ${fy} H ${mx} V ${childCy} H ${cx}`,
          });
        } else {
          const fx = feeder.x;
          const cx = child.x + child.width;
          const mx = fx + (cx - fx) * 0.45;
          segments.push({
            feederId: feeder.matchId,
            childId,
            d: `M ${fx} ${fy} H ${mx} V ${childCy} H ${cx}`,
          });
        }
      }
      continue;
    }

    if (childId === "M101" || childId === "M102") {
      for (const feeder of [feederA, feederB]) {
        const fy = feeder.y + feeder.height / 2;
        const cx = child.half === "left" ? child.x : child.x + child.width;
        if (feeder.half === "left") {
          const fx = feeder.x + feeder.width;
          const mx = fx + (cx - fx) * 0.5;
          segments.push({
            feederId: feeder.matchId,
            childId,
            d: `M ${fx} ${fy} H ${mx} V ${childCy} H ${cx}`,
          });
        } else {
          const fx = feeder.x;
          const mx = fx + (cx - fx) * 0.5;
          segments.push({
            feederId: feeder.matchId,
            childId,
            d: `M ${fx} ${fy} H ${mx} V ${childCy} H ${cx}`,
          });
        }
      }
      continue;
    }

    const childHalf = child.half;
    const fy1 = feederA.y + feederA.height / 2;
    const fy2 = feederB.y + feederB.height / 2;
    const fMidY = (fy1 + fy2) / 2;

    if (childHalf === "left") {
      const fx = feederA.x + feederA.width;
      const cx = child.x;
      const mx = fx + (cx - fx) * 0.5;
      segments.push(
        {
          feederId: feeders[0],
          childId,
          d: `M ${fx} ${fy1} H ${mx} V ${fMidY}`,
        },
        {
          feederId: feeders[1],
          childId,
          d: `M ${fx} ${fy2} H ${mx} V ${fMidY}`,
        },
        {
          feederId: feeders[0],
          childId,
          d: `M ${mx} ${fMidY} H ${cx}`,
        }
      );
    } else {
      const fx = feederA.x;
      const cx = child.x + child.width;
      const mx = fx + (cx - fx) * 0.5;
      segments.push(
        {
          feederId: feeders[0],
          childId,
          d: `M ${fx} ${fy1} H ${mx} V ${fMidY}`,
        },
        {
          feederId: feeders[1],
          childId,
          d: `M ${fx} ${fy2} H ${mx} V ${fMidY}`,
        },
        {
          feederId: feeders[0],
          childId,
          d: `M ${mx} ${fMidY} H ${cx}`,
        }
      );
    }
  }

  return segments;
}
