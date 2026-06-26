import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../types";
import { deriveMomentum } from "./deriveMomentum";

const HOME = "USA";
const AWAY = "MEX";

function makeEvent(overrides: Partial<MatchEvent>): MatchEvent {
  return {
    providerId: "test",
    minute: 0,
    type: "goal",
    teamId: HOME,
    playerName: "Player",
    ...overrides
  };
}

describe("deriveMomentum", () => {
  it("returns 18 buckets for 90 minutes with 5-min intervals", () => {
    const result = deriveMomentum([], HOME);
    expect(result).toHaveLength(18);
  });

  it("assigns bucket indices correctly", () => {
    const result = deriveMomentum([], HOME);
    expect(result[0].startMinute).toBe(0);
    expect(result[0].endMinute).toBe(5);
    expect(result[17].startMinute).toBe(85);
    expect(result[17].endMinute).toBe(90);
  });

  it("returns all zeros for no events", () => {
    const result = deriveMomentum([], HOME);
    expect(result.every((b) => b.homeValue === 0 && b.awayValue === 0)).toBe(true);
  });

  it("assigns home goal to correct bucket and home team", () => {
    const events = [makeEvent({ minute: 37, type: "goal", teamId: HOME })];
    const result = deriveMomentum(events, HOME);
    // minute 37 → bucket index 7 (37÷5 = 7.4 → floor 7)
    expect(result[7].homeValue).toBeGreaterThan(0);
    expect(result[7].awayValue).toBe(0);
  });

  it("assigns away goal to away value", () => {
    const events = [makeEvent({ minute: 70, type: "goal", teamId: AWAY })];
    const result = deriveMomentum(events, HOME);
    // minute 70 → bucket index 14
    expect(result[14].awayValue).toBeGreaterThan(0);
    expect(result[14].homeValue).toBe(0);
  });

  it("clamps values to 0–10 scale", () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      makeEvent({ minute: i, type: "goal", teamId: HOME })
    );
    const result = deriveMomentum(events, HOME);
    expect(result.every((b) => b.homeValue >= 0 && b.homeValue <= 10)).toBe(true);
  });

  it("ignores substitution events (weight 0)", () => {
    const events = [makeEvent({ minute: 60, type: "substitution", teamId: HOME })];
    const result = deriveMomentum(events, HOME);
    expect(result.every((b) => b.homeValue === 0 && b.awayValue === 0)).toBe(true);
  });
});
