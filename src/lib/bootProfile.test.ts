import { describe, expect, it } from "vitest";
import { shouldDeferHeavyBoot, splashMinimumHoldMs } from "./bootProfile";

describe("bootProfile", () => {
  it("uses shorter splash hold on mobile fast path", () => {
    expect(splashMinimumHoldMs(true)).toBeLessThan(splashMinimumHoldMs(false));
  });

  it("uses shorter splash hold when cache hit on desktop", () => {
    expect(splashMinimumHoldMs(false, true)).toBe(400);
    expect(splashMinimumHoldMs(false, true)).toBeLessThan(splashMinimumHoldMs(false, false));
  });

  it("uses 280ms splash hold on mobile with cache", () => {
    expect(splashMinimumHoldMs(true, true)).toBe(280);
  });

  it("defers heavy boot for all platforms", () => {
    expect(shouldDeferHeavyBoot(false, false, false)).toBe(true);
    expect(shouldDeferHeavyBoot(true, false, true)).toBe(true);
  });
});
