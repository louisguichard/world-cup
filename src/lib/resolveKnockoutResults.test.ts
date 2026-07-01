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

const morocco: Team = {
  id: "mar",
  name: "Morocco",
  shortName: "MAR",
  abbreviation: "MAR",
  group: "E",
  rating: 1750
};

const netherlands: Team = {
  id: "ned",
  name: "Netherlands",
  shortName: "NED",
  abbreviation: "NED",
  group: "E",
  rating: 1850
};

const brazil: Team = {
  id: "bra",
  name: "Brazil",
  shortName: "BRA",
  abbreviation: "BRA",
  group: "F",
  rating: 2000
};

const teamsById: Record<string, Team> = {
  por: portugal,
  rsa: southAfrica,
  fra: france,
  mar: morocco,
  ned: netherlands,
  bra: brazil
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

  it("stamps live knockout leader with projected certainty and propagates to R16", () => {
    const bracket: BracketMatch[] = [
      simulatedR32("M74", "ned", "mar"),
      {
        id: "M89",
        stage: "R16",
        label: "M89",
        homeTeamId: "ned",
        awayTeamId: "bra",
        homeSeedLabel: "W74",
        awaySeedLabel: "W77",
        homeScore: 2,
        awayScore: 1,
        winnerTeamId: "ned",
        source: "simulated",
      },
    ];

    const merged: MergedMatch[] = [
      {
        id: "M74",
        matchId: "M74",
        stage: "R32",
        date: "2026-06-29T19:00:00Z",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "live",
        homeScore: 1,
        awayScore: 2,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    const m74 = result.find((m) => m.id === "M74");
    const m89 = result.find((m) => m.id === "M89");

    expect(m74?.homeScore).toBe(1);
    expect(m74?.awayScore).toBe(2);
    expect(m74?.winnerTeamId).toBe("mar");
    expect(m74?.homeCertainty).toBe("projected");
    expect(m89?.homeTeamId).toBe("mar");
    expect(m89?.homeCertainty).toBe("projected");
  });

  it("does not propagate winner from a live tied knockout match", () => {
    const bracket: BracketMatch[] = [simulatedR32("M74", "ned", "mar")];
    const merged: MergedMatch[] = [
      {
        id: "M74",
        matchId: "M74",
        stage: "R32",
        date: "2026-06-29T19:00:00Z",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "live",
        homeScore: 1,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    const m74 = result.find((m) => m.id === "M74");

    expect(m74?.winnerTeamId).toBeUndefined();
    expect(m74?.homeCertainty).toBe("projected");
  });

  it("does not confirm unlocked completed knockout results", () => {
    const bracket: BracketMatch[] = [simulatedR32("M76", "ned", "mar")];
    const merged = [
      completedKnockout({
        id: "M76",
        homeTeamId: "ned",
        awayTeamId: "mar",
        homeScore: 2,
        awayScore: 1,
        locked: false,
      }),
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    const m76 = result.find((m) => m.id === "M76");

    expect(m76?.homeScore).toBe(2);
    expect(m76?.awayScore).toBe(1);
    expect(m76?.winnerTeamId).toBe("ned");
    expect(m76?.homeCertainty).toBe("projected");
    expect(m76?.awayCertainty).toBe("projected");
  });

  it("propagates locked MAR win into R16 and evicts stale NED simulation", () => {
    const bracket: BracketMatch[] = [
      simulatedR32("M76", "ned", "mar"),
      {
        id: "M91",
        stage: "R16",
        label: "M91",
        homeTeamId: "ned",
        awayTeamId: "fra",
        homeSeedLabel: "W76",
        awaySeedLabel: "W78",
        homeScore: 2,
        awayScore: 1,
        winnerTeamId: "ned",
        source: "simulated",
      },
    ];

    const merged = [
      completedKnockout({
        id: "M76",
        homeTeamId: "ned",
        awayTeamId: "mar",
        homeScore: 1,
        awayScore: 2,
      }),
    ];

    const result = resolveKnockoutResults(bracket, merged, teamsById);
    const m91 = result.find((m) => m.id === "M91");

    expect(m91?.homeTeamId).toBe("mar");
    expect(m91?.homeTeamId).not.toBe("ned");
    expect(m91?.homeCertainty).toBe("confirmed");
    expect(m91?.winnerTeamId).not.toBe("ned");
  });
});
