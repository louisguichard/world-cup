import { describe, expect, it } from "vitest";
import { buildConfirmedOnlyBracket } from "./buildConfirmedOnlyBracket";
import type { Match, MergedMatch, Team } from "../../types";

function team(id: string): Team {
  return {
    id,
    name: id,
    shortName: id,
    abbreviation: id.toUpperCase().slice(0, 3),
    group: "E",
    logo: "",
    rating: 1500,
  };
}

function liveMatch(overrides: Partial<MergedMatch> & Pick<MergedMatch, "id">): MergedMatch {
  return {
    matchId: overrides.id,
    homeTeamId: "ger",
    awayTeamId: "par",
    date: "2026-06-29",
    status: "completed",
    locked: true,
    source: "espn",
    homeScore: 1,
    awayScore: 1,
    penaltyShootout: { homeScore: 3, awayScore: 4 },
    ...overrides,
  };
}

describe("buildConfirmedOnlyBracket", () => {
  it("does not advance eliminated teams into later rounds", () => {
    const teams = [team("ger"), team("par"), team("fra")];
    const liveMatches: Record<string, MergedMatch> = {
      M76: liveMatch({ id: "M76", homeTeamId: "ger", awayTeamId: "par" }),
    };

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {},
    });

    const laterWithGermany = bracket.filter(
      (slot) =>
        slot.stage !== "R32" &&
        (slot.homeTeamId === "ger" || slot.awayTeamId === "ger")
    );

    expect(laterWithGermany).toHaveLength(0);

    const m76 = bracket.find((slot) => slot.id === "M76");
    expect(m76?.winnerTeamId).toBe("par");
  });

  it("only confirms later-round slots from locked feeder winners", () => {
    const teams = [team("par"), team("fra")];
    const liveMatches: Record<string, MergedMatch> = {
      M76: liveMatch({ id: "M76", homeTeamId: "ger", awayTeamId: "par" }),
    };

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {},
    });

    const m91 = bracket.find((slot) => slot.id === "M91");
    expect(m91?.homeTeamId).toBe("par");
    expect(m91?.homeCertainty).toBe("confirmed");
    expect(m91?.awayCertainty).toBe("tbd");
  });
});
