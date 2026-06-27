import { describe, expect, it } from "vitest";
import { APP_COPY } from "../lib/appCopy";
import { computeDisplay } from "../hooks/useLiveClock";

describe("computeDisplay", () => {
  it("shows Halftime at half time", () => {
    expect(computeDisplay("half_time", 45).label).toBe(APP_COPY.match.halftime);
  });

  it("shows 90+3 in second half stoppage", () => {
    expect(computeDisplay("second_half", 90, 3).label).toBe("90+3'");
  });

  it("shows Final at full time", () => {
    expect(computeDisplay("full_time", 90).label).toBe(APP_COPY.match.final);
  });
});
