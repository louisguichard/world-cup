import { describe, expect, it } from "vitest";
import { splashMinimumHoldMs } from "./bootProfile";

describe("bootProfile", () => {
  it("uses shorter splash hold on mobile fast path", () => {
    expect(splashMinimumHoldMs(true)).toBeLessThan(splashMinimumHoldMs(false));
  });
});
