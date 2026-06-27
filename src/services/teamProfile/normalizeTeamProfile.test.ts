import { describe, expect, it } from "vitest";
import {
  formatMarketValue,
  normalizeSofaTeamDetails,
  normalizeSofaTeamPlayers,
  normalizeSofaTeamStatistics,
  positionLabel,
} from "./normalizeTeamProfile";

describe("normalizeTeamProfile", () => {
  it("normalizes team details with manager", () => {
    const result = normalizeSofaTeamDetails({
      id: 4748,
      name: "Brazil",
      nameCode: "BRA",
      manager: { name: "Carlo Ancelotti" },
    });
    expect(result?.name).toBe("Brazil");
    expect(result?.managerName).toBe("Carlo Ancelotti");
  });

  it("normalizes players from wrapped payload", () => {
    const result = normalizeSofaTeamPlayers({
      players: [
        {
          id: 1,
          name: "Player A",
          shirtNumber: 10,
          position: "F",
          team: { name: "Club" },
          proposedMarketValue: { value: 50_000_000, currency: "EUR" },
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].clubName).toBe("Club");
    expect(result[0].marketValue?.value).toBe(50_000_000);
  });

  it("normalizes statistics from wrapped payload", () => {
    const result = normalizeSofaTeamStatistics({
      statistics: { goalsScored: 7, avgRating: 7.13 },
    });
    expect(result?.goalsScored).toBe(7);
    expect(result?.avgRating).toBe(7.13);
  });

  it("formats market values", () => {
    expect(formatMarketValue(146_000_000, "EUR")).toBe("€146.0M");
    expect(positionLabel("F")).toBe("FWD");
  });
});
