import { describe, expect, it } from "vitest";
import {
  buildSplitBracketConnectors,
  buildSplitBracketLayout,
  resolveBracketHalf,
  SPLIT_BRACKET_METRICS,
} from "./buildSplitBracketLayout";
import { BRACKET_STAGE_SHORT_LABELS } from "./bracketStageLabels";
import { R32_VISUAL_ORDER } from "./bracketProgression";

const ALL_KNOCKOUT = [
  ...R32_VISUAL_ORDER,
  "M89",
  "M90",
  "M91",
  "M92",
  "M93",
  "M94",
  "M95",
  "M96",
  "M97",
  "M98",
  "M99",
  "M100",
  "M101",
  "M102",
  "M103",
  "M104",
];

describe("buildSplitBracketLayout", () => {
  it("assigns left and right halves from R32 visual order", () => {
    expect(resolveBracketHalf("M77")).toBe("left");
    expect(resolveBracketHalf("M80")).toBe("left");
    expect(resolveBracketHalf("M83")).toBe("right");
    expect(resolveBracketHalf("M87")).toBe("right");
    expect(resolveBracketHalf("M104")).toBe("center");
  });

  it("propagates half through downstream winner routes", () => {
    expect(resolveBracketHalf("M89")).toBe("left");
    expect(resolveBracketHalf("M97")).toBe("left");
    expect(resolveBracketHalf("M101")).toBe("left");
    expect(resolveBracketHalf("M95")).toBe("right");
    expect(resolveBracketHalf("M100")).toBe("right");
    expect(resolveBracketHalf("M102")).toBe("right");
  });

  it("places Final between left SF and right SF columns", () => {
    const layout = buildSplitBracketLayout(ALL_KNOCKOUT, BRACKET_STAGE_SHORT_LABELS);
    expect(layout).not.toBeNull();

    const final = layout!.nodes.get("M104")!;
    const leftSf = layout!.nodes.get("M101")!;
    const rightSf = layout!.nodes.get("M102")!;

    expect(final.x).toBeGreaterThan(leftSf.x + leftSf.width);
    expect(final.x + final.width).toBeLessThan(rightSf.x);
    expect(final.y).toBeCloseTo((leftSf.y + rightSf.y) / 2, 0);
  });

  it("mirrors R32 on outer columns with left half further left than right half", () => {
    const layout = buildSplitBracketLayout(ALL_KNOCKOUT, BRACKET_STAGE_SHORT_LABELS)!;
    const leftR32 = layout.nodes.get("M73")!;
    const rightR32 = layout.nodes.get("M87")!;

    expect(leftR32.x).toBeLessThan(layout.nodes.get("M89")!.x);
    expect(layout.nodes.get("M96")!.x).toBeLessThan(rightR32.x);
  });

  it("centers R16 slots vertically between feeder R32 pairs", () => {
    const layout = buildSplitBracketLayout(ALL_KNOCKOUT, BRACKET_STAGE_SHORT_LABELS)!;
    const m73 = layout.nodes.get("M73")!;
    const m74 = layout.nodes.get("M74")!;
    const m89 = layout.nodes.get("M89")!;

    expect(m89.y + m89.height / 2).toBeCloseTo((m73.y + m73.height / 2 + m74.y + m74.height / 2) / 2, 0);
  });

  it("builds connector paths for visible winner bracket only", () => {
    const visible = new Set(ALL_KNOCKOUT);
    const layout = buildSplitBracketLayout(visible, BRACKET_STAGE_SHORT_LABELS)!;
    const connectors = buildSplitBracketConnectors(layout, visible);

    expect(connectors.length).toBeGreaterThan(30);
    expect(connectors.some((segment) => segment.childId === "M104")).toBe(true);
    expect(connectors.every((segment) => visible.has(segment.feederId))).toBe(true);
  });

  it("returns canvas dimensions large enough for full tree", () => {
    const layout = buildSplitBracketLayout(ALL_KNOCKOUT, BRACKET_STAGE_SHORT_LABELS)!;
    expect(layout.width).toBeGreaterThan(9 * SPLIT_BRACKET_METRICS.cardWidth);
    expect(layout.height).toBeGreaterThan(8 * SPLIT_BRACKET_METRICS.rowUnit);
  });
});
