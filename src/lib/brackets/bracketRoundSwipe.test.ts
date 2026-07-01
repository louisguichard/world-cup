import { describe, expect, it } from "vitest";
import { resolveAdjacentBracketStage } from "./bracketRoundSwipe";
import type { Stage } from "../../types";

const stages: Stage[] = ["R32", "R16", "QF", "SF", "Final"];

describe("bracketRoundSwipe", () => {
  it("returns the next stage when swiping forward", () => {
    expect(resolveAdjacentBracketStage(stages, "R32", 1)).toBe("R16");
    expect(resolveAdjacentBracketStage(stages, "SF", 1)).toBe("Final");
  });

  it("returns the previous stage when swiping back", () => {
    expect(resolveAdjacentBracketStage(stages, "QF", -1)).toBe("R16");
    expect(resolveAdjacentBracketStage(stages, "R32", -1)).toBeNull();
  });

  it("returns null at the ends of the sequence", () => {
    expect(resolveAdjacentBracketStage(stages, "Final", 1)).toBeNull();
  });
});
