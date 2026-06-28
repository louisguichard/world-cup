import { describe, expect, it } from "vitest";
import { yahooCodeToIconKind } from "./yahooConditionIcon";

describe("yahooCodeToIconKind", () => {
  it("maps sunny and rainy codes", () => {
    expect(yahooCodeToIconKind(32)).toBe("clear-day");
    expect(yahooCodeToIconKind(31)).toBe("clear-night");
    expect(yahooCodeToIconKind(12)).toBe("rain");
    expect(yahooCodeToIconKind(16)).toBe("snow");
    expect(yahooCodeToIconKind(4)).toBe("thunderstorm");
  });
});
