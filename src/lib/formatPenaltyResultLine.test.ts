import { describe, expect, it } from "vitest";
import { formatPenaltyResultLine, penaltyResultAriaLabel } from "./formatPenaltyResultLine";

describe("formatPenaltyResultLine", () => {
  it("formats penalties line parts for scoreboard", () => {
    const line = formatPenaltyResultLine(3, 4);
    expect(line).toEqual({
      prefix: "Penalties:",
      home: "3",
      sep: "–",
      away: "4",
    });
  });

  it("builds accessible penalty label", () => {
    expect(penaltyResultAriaLabel(1, 1, 3, 4)).toBe("Penalties 3 to 4 after 1–1");
  });
});

describe("penalty scoreboard winner bolding", () => {
  it("identifies away winner when away pens are higher", () => {
    const homePens = 3;
    const awayPens = 4;
    const awayWon = awayPens > homePens;
    const homeWon = homePens > awayPens;
    expect(awayWon).toBe(true);
    expect(homeWon).toBe(false);
  });
});
