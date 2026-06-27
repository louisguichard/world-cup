import { describe, expect, it } from "vitest";
import { mergeWorldCupHistoryBundle, deriveTitleLeaders } from "./worldCupHistoryStats";
import {
  normalizeAwardList,
  normalizeWinners,
  normalizeTournamentDetails,
} from "../services/WorldCupHistoryClient";

describe("WorldCupHistoryClient normalize", () => {
  it("normalizes winners list", () => {
    const winners = normalizeWinners([
      { year: 2018, country: "France", runner_up: "Croatia" },
      { Year: 2014, Winner: "Germany" },
    ]);
    expect(winners).toHaveLength(2);
    expect(winners[0]?.winner).toBe("France");
    expect(winners[0]?.runnerUp).toBe("Croatia");
  });

  it("normalizes award list", () => {
    const awards = normalizeAwardList({
      golden_ball: [{ year: 2018, player: "Luka Modric", country: "Croatia" }],
    });
    expect(awards[0]?.player).toBe("Luka Modric");
  });

  it("normalizes tournament details", () => {
    const cups = normalizeTournamentDetails([
      { year: 2018, host: "Russia", winner: "France", runner_up: "Croatia" },
    ]);
    expect(cups[0]?.host).toBe("Russia");
  });
});

describe("worldCupHistoryStats", () => {
  it("derives title leaders from winners", () => {
    const bundle = mergeWorldCupHistoryBundle({
      fetchedAt: "2026-01-01T00:00:00.000Z",
      winners: [
        { year: 2018, winner: "France" },
        { year: 2014, winner: "Germany" },
        { year: 2010, winner: "Spain" },
      ],
      worldCups: [],
      goldenBall: [],
      goldenBoot: [],
      goldenGlove: [],
      bestYoungPlayer: [],
      yearDetails: {},
      unavailable: [],
      partial: false,
    });

    const leaders = deriveTitleLeaders(bundle);
    expect(leaders[0]?.player).toBe("France");
    expect(leaders[0]?.value).toBe(1);
  });
});
