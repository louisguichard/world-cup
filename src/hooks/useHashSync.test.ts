import { describe, expect, it } from "vitest";
import { buildAppHash, parseAppHash } from "./useHashSync";

describe("useHashSync", () => {
  it("parses main tabs", () => {
    expect(parseAppHash("#live")).toEqual({ tab: "live", simulatorMode: "tournament" });
    expect(parseAppHash("#groups")).toEqual({ tab: "groups", simulatorMode: "tournament" });
  });

  it("parses simulator sub-routes", () => {
    expect(parseAppHash("#simulator")).toEqual({ tab: "simulator", simulatorMode: "tournament" });
    expect(parseAppHash("#simulator/probabilities")).toEqual({
      tab: "simulator",
      simulatorMode: "probabilities"
    });
    expect(parseAppHash("#simulator/methodology")).toEqual({
      tab: "simulator",
      simulatorMode: "methodology"
    });
  });

  it("builds hashes for simulator modes", () => {
    expect(buildAppHash("simulator", "tournament")).toBe("#simulator");
    expect(buildAppHash("simulator", "probabilities")).toBe("#simulator/probabilities");
    expect(buildAppHash("live", "methodology")).toBe("#live");
  });
});
