import { describe, expect, it } from "vitest";
import { resolveKnockoutResults } from "./tournament";
import type { BracketMatch, MergedMatch, Team } from "../types";

const portugal: Team = {
  id: "por",
  name: "Portugal",
  shortName: "POR",
  abbreviation: "POR",
  group: "H",
  rating: 1900
};

const southAfrica: Team = {
  id: "rsa",
  name: "South Africa",
  shortName: "RSA",
  abbreviation: "RSA",
  group: "H",
  rating: 1500
};

const france: Team = {
  id: "fra",
  name: "France",
  shortName: "FRA",
  abbreviation: "FRA",
  group: "A",
  rating: 1950
};

const teamsById: Record<string, Team> = {
  por: portugal,
  rsa: southAfrica,
  fra: france
};

function completedKnockout(partial: Partial<MergedMatch> & Pick<MergedMatch, "id">): MergedMatch {
  return {
    matchId: partial.matchId ?? partial.id,
    date: "2026-06-28T16:00:00Z",
    homeTeamId: partial.homeTeamId ?? "por",
    awayTeamId: partial.awayTeamId ?? "rsa",
    status: "completed",
    homeScore: partial.homeScore ?? 2,
    awayScore: partial.awayScore ?? 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: true,
    source: "espn",
    stage: partial.stage ?? "R32",
    ...partial
  };
}

function simulatedR32(id: string, homeTeamId: string, awayTeamId: string): BracketMatch {
  return {
    id,
    stage: "R32",
    label: id,
    homeTeamId,
    awayTeamId,
    homeSeedLabel: "1H",
    awaySeedLabel: "2H",
    homeScore: 1,
    awayScore: 0,
    winnerTeamId: homeTeamId,
    source: "simulated"
  };
}

describe("resolveKnockoutResults", () => {
  it("stamps completed R32 with real scores and winner", () => {
    const bracket: BracketMatch[] = [simulatedR32("M73", "rsa", "por")];
    const merged = [
      completedKnockout({
        id: "M73",
        homeTeamId: "por",
        awayTeamId: "rsa",
        homeScore: 2,
        awayScore: 1
      })
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    const m73 = result.find((m) => m.id === "M73");

    expect(m73?.source).toBe("scheduled");
    expect(m73?.homeScore).toBe(2);
    expect(m73?.awayScore).toBe(1);
    expect(m73?.winnerTeamId).toBe("por");
    expect(m73?.homeCertainty).toBe("confirmed");
    expect(m73?.awayCertainty).toBe("confirmed");
  });

  it("resolves penalty shootout winner on a draw", () => {
    const bracket: BracketMatch[] = [simulatedR32("M74", "fra", "por")];
    const merged = [
      completedKnockout({
        id: "M74",
        homeTeamId: "fra",
        awayTeamId: "por",
        homeScore: 1,
        awayScore: 1,
        penaltyShootout: {
          home: [],
          away: [],
          homeScore: 4,
          awayScore: 5
        }
      })
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    expect(result.find((m) => m.id === "M74")?.winnerTeamId).toBe("por");
  });

  it("propagates W73 winner into downstream R16 slot", () => {
    const bracket: BracketMatch[] = [
      simulatedR32("M73", "rsa", "por"),
      {
        id: "M90",
        stage: "R16",
        label: "M90",
        homeTeamId: "rsa",
        awayTeamId: "fra",
        homeSeedLabel: "W73",
        awaySeedLabel: "W75",
        homeScore: 2,
        awayScore: 1,
        winnerTeamId: "rsa",
        source: "simulated"
      }
    ];

    const merged = [
      completedKnockout({
        id: "M73",
        homeTeamId: "por",
        awayTeamId: "rsa",
        homeScore: 2,
        awayScore: 0
      })
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    const m90 = result.find((m) => m.id === "M90");

    expect(m90?.homeTeamId).toBe("por");
    expect(m90?.winnerTeamId).not.toBe("rsa");
    expect(m90?.homeCertainty).toBe("confirmed");
  });

  it("clears stale downstream simulation after feeder correction", () => {
    const bracket: BracketMatch[] = [
      simulatedR32("M73", "rsa", "por"),
      {
        id: "M90",
        stage: "R16",
        label: "M90",
        homeTeamId: "rsa",
        awayTeamId: "fra",
        homeSeedLabel: "W73",
        awaySeedLabel: "W75",
        homeScore: 3,
        awayScore: 0,
        winnerTeamId: "rsa",
        source: "simulated"
      }
    ];

    const merged = [
      completedKnockout({
        id: "M73",
        homeTeamId: "por",
        awayTeamId: "rsa",
        homeScore: 1,
        awayScore: 0
      })
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    const m90 = result.find((m) => m.id === "M90");

    expect(m90?.homeTeamId).toBe("por");
    expect(m90?.winnerTeamId).not.toBe("rsa");
    expect(m90?.homeScore).not.toBe(3);
  });

  it("ignores incomplete and group-stage matches", () => {
    const bracket: BracketMatch[] = [simulatedR32("M73", "rsa", "por")];
    const merged: MergedMatch[] = [
      {
        id: "group-1",
        group: "A",
        date: "2026-06-20T16:00:00Z",
        homeTeamId: "fra",
        awayTeamId: "por",
        status: "completed",
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: true,
        source: "espn"
      },
      {
        id: "M73",
        matchId: "M73",
        date: "2026-06-28T16:00:00Z",
        homeTeamId: "por",
        awayTeamId: "rsa",
        status: "scheduled",
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
        stage: "R32"
      }
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    expect(result).toBe(bracket);
    expect(result.find((m) => m.id === "M73")?.source).toBe("simulated");
    expect(result.find((m) => m.id === "M73")?.winnerTeamId).toBe("rsa");
  });
});
