import { describe, expect, it } from "vitest";
import { BRACKET_FEED_MAP } from "../bracketTree";
import {
  buildBracketVisualIndexMap,
  kickoffMsForBracketMatch,
  orderBracketByStage,
  R32_VISUAL_ORDER,
  sortBracketMatchesByDate,
} from "./bracketVisualOrder";
import type { BracketMatch } from "../../types";

function slot(id: string, stage: BracketMatch["stage"]): BracketMatch {
  return {
    id,
    stage,
    label: id,
    homeCertainty: "tbd",
    awayCertainty: "tbd",
    source: "scheduled",
  };
}

describe("bracketVisualOrder", () => {
  it("places each R16 feeder pair adjacent in R32 visual order", () => {
    for (const [, feeders] of Object.entries(BRACKET_FEED_MAP)) {
      if (!feeders) continue;
      const [a, b] = feeders;
      const ia = R32_VISUAL_ORDER.indexOf(a);
      const ib = R32_VISUAL_ORDER.indexOf(b);
      if (ia < 0 || ib < 0) continue;
      expect(Math.abs(ia - ib)).toBe(1);
    }
  });

  it("assigns R16 child index to feeder midpoint", () => {
    const index = buildBracketVisualIndexMap();
    expect(index.get("M89")).toBe((index.get("M73")! + index.get("M74")!) / 2);
    expect(index.get("M90")).toBe((index.get("M75")! + index.get("M76")!) / 2);
  });

  it("sorts emitted bracket slots by topology, not emission order", () => {
    const shuffled = [
      slot("M96", "R16"),
      slot("M89", "R16"),
      slot("M88", "R32"),
      slot("M74", "R32"),
      slot("M73", "R32"),
      slot("M75", "R32"),
    ];

    const ordered = orderBracketByStage(shuffled);
    expect(ordered.R32.map((m) => m.id)).toEqual(["M73", "M74", "M75", "M88"]);
    expect(ordered.R16.map((m) => m.id)).toEqual(["M89", "M96"]);
  });

  it("sorts by kickoff date — M76 before M74 before M75 on Jun 29", () => {
    const jun29 = [slot("M74", "R32"), slot("M76", "R32"), slot("M75", "R32")];
    expect(sortBracketMatchesByDate(jun29).map((m) => m.id)).toEqual(["M76", "M74", "M75"]);
    expect(kickoffMsForBracketMatch("M76")).toBeLessThan(kickoffMsForBracketMatch("M74"));
    expect(kickoffMsForBracketMatch("M74")).toBeLessThan(kickoffMsForBracketMatch("M75"));
  });
});
