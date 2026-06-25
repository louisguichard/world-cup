import { describe, expect, it } from "vitest";
import { rankBestThirds } from "./bestThirds";
import type { GroupStanding } from "../types";

describe("rankBestThirds", () => {
  it("ranks third-place teams by points", () => {
    const standings: GroupStanding[] = [
      {
        group: "A",
        rows: [
          { teamId: "a1", group: "A", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, points: 6, conduct: 0, rating: 1400 },
          { teamId: "a2", group: "A", played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: 0, points: 4, conduct: 0, rating: 1380 },
          { teamId: "a3", group: "A", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 5, goalDifference: -2, points: 3, conduct: 0, rating: 1360 },
          { teamId: "a4", group: "A", played: 3, wins: 0, draws: 1, losses: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: 1, conduct: 0, rating: 1340 }
        ]
      }
    ];
    const best = rankBestThirds(standings);
    expect(best[0]?.teamId).toBe("a3");
    expect(best[0]?.points).toBe(3);
  });
});
