import { describe, expect, it } from "vitest";
import { knockoutStageFromMatchId } from "./knockoutStageFromMatchId";

describe("knockoutStageFromMatchId", () => {
  it("maps R32 ids M73–M88", () => {
    expect(knockoutStageFromMatchId("M73")).toBe("R32");
    expect(knockoutStageFromMatchId("M88")).toBe("R32");
  });

  it("maps R16 ids M89–M96", () => {
    expect(knockoutStageFromMatchId("M89")).toBe("R16");
    expect(knockoutStageFromMatchId("M96")).toBe("R16");
  });

  it("maps later rounds", () => {
    expect(knockoutStageFromMatchId("M97")).toBe("QF");
    expect(knockoutStageFromMatchId("M101")).toBe("SF");
    expect(knockoutStageFromMatchId("M103")).toBe("ThirdPlace");
    expect(knockoutStageFromMatchId("M104")).toBe("Final");
  });

  it("returns undefined for non-knockout ids", () => {
    expect(knockoutStageFromMatchId("M72")).toBeUndefined();
    expect(knockoutStageFromMatchId("M105")).toBeUndefined();
    expect(knockoutStageFromMatchId("espn-1")).toBeUndefined();
  });
});
