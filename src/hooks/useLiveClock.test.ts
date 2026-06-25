import { describe, expect, it } from "vitest";
import { computeDisplay } from "../hooks/useLiveClock";

describe("computeDisplay", () => {
  it("shows HT at half time", () => {
    expect(computeDisplay("half_time", 45).label).toBe("HT");
  });

  it("shows 90+3 in second half stoppage", () => {
    expect(computeDisplay("second_half", 90, 3).label).toBe("90+3'");
  });

  it("shows FT at full time", () => {
    expect(computeDisplay("full_time", 90).label).toBe("FT");
  });
});
