import { describe, expect, it } from "vitest";
import { derivePlayerRating } from "./playerRating";

describe("derivePlayerRating", () => {
  it("returns 0 for zero minutes played", () => {
    expect(derivePlayerRating({ minutesPlayed: 0 })).toBe(0);
  });

  it("returns a baseline rating for 90 minutes with no contributions", () => {
    const rating = derivePlayerRating({ minutesPlayed: 90 });
    expect(rating).toBeGreaterThanOrEqual(5.0);
    expect(rating).toBeLessThanOrEqual(7.0);
  });

  it("boosts rating for goals", () => {
    const noGoals = derivePlayerRating({ minutesPlayed: 90 });
    const withGoal = derivePlayerRating({ minutesPlayed: 90, goals: 1 });
    expect(withGoal).toBeGreaterThan(noGoals);
  });

  it("penalises yellow cards", () => {
    const clean = derivePlayerRating({ minutesPlayed: 90 });
    const booked = derivePlayerRating({ minutesPlayed: 90, yellowCards: 1 });
    expect(booked).toBeLessThan(clean);
  });

  it("penalises red cards more than yellow cards", () => {
    const yellow = derivePlayerRating({ minutesPlayed: 90, yellowCards: 1 });
    const red = derivePlayerRating({ minutesPlayed: 90, redCards: 1 });
    expect(red).toBeLessThan(yellow);
  });

  it("clamps rating to 0–10 range", () => {
    const extreme = derivePlayerRating({
      minutesPlayed: 90,
      goals: 10,
      assists: 5
    });
    expect(extreme).toBeLessThanOrEqual(10);

    const negative = derivePlayerRating({
      minutesPlayed: 90,
      redCards: 5,
      goalsConceded: 10
    });
    expect(negative).toBeGreaterThanOrEqual(0);
  });

  it("gives credit for saves (GK)", () => {
    const noSaves = derivePlayerRating({ minutesPlayed: 90 });
    const saves = derivePlayerRating({ minutesPlayed: 90, saves: 5 });
    expect(saves).toBeGreaterThan(noSaves);
  });
});
