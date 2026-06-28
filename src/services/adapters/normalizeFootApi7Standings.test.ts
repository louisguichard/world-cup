import { describe, expect, it } from "vitest";
import { normalizeFootApi7Groups } from "./normalizeFootApi7Standings";

describe("normalizeFootApi7Groups", () => {
  it("normalizes SofaScore-style group standings", () => {
    const standings = normalizeFootApi7Groups({
      groups: [
        {
          name: "Group A",
          teamStandings: [
            {
              team: { name: "Mexico" },
              matches: 2,
              wins: 1,
              draws: 1,
              losses: 0,
              scoresFor: 3,
              scoresAgainst: 1,
              points: 4,
            },
          ],
        },
      ],
    });

    expect(standings).toHaveLength(1);
    expect(standings[0]?.group).toBe("A");
    expect(standings[0]?.rows[0]?.teamId).toBe("mex");
    expect(standings[0]?.rows[0]?.points).toBe(4);
  });

  it("normalizes nested standings tables", () => {
    const standings = normalizeFootApi7Groups({
      standings: [
        {
          name: "Group B",
          rows: [
            {
              team: { name: "Brazil" },
              matches: 1,
              wins: 1,
              points: 3,
              scoresFor: 2,
              scoresAgainst: 0,
            },
          ],
        },
      ],
    });

    expect(standings[0]?.group).toBe("B");
    expect(standings[0]?.rows[0]?.teamId).toBe("bra");
  });
});
