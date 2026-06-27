import { describe, expect, it } from "vitest";
import { isPlDataPathAllowed, pldataEndpoints } from "../config/pldataEndpoints";
import {
  normalizePlDataMatch,
  normalizePlDataPlayer,
  normalizePlDataStandingRow,
  normalizePlDataTeam,
  normalizePlDataTopScorer,
} from "./PlDataClient";

describe("pldataEndpoints", () => {
  it("builds player and team routes", () => {
    expect(pldataEndpoints.player("Mohamed Salah")).toBe("/player/Mohamed%20Salah");
    expect(pldataEndpoints.team("Arsenal")).toBe("/team/Arsenal");
    expect(pldataEndpoints.matches({ limit: 5 })).toBe("/matches?limit=5");
    expect(pldataEndpoints.statsTopScorers()).toBe("/stats/topscorers");
    expect(pldataEndpoints.squadByTeam("Arsenal")).toBe("/squad/team/Arsenal");
  });

  it("allowlists known proxy paths", () => {
    expect(isPlDataPathAllowed("/player/Salah")).toBe(true);
    expect(isPlDataPathAllowed("/stats/topscorers")).toBe(true);
    expect(isPlDataPathAllowed("/unknown")).toBe(false);
  });
});

describe("PlDataClient normalize", () => {
  it("normalizes player detail", () => {
    const player = normalizePlDataPlayer({
      id: 123,
      name: "Mohamed Salah",
      position: "F",
      shirtNumber: 11,
      age: 32,
      nationality: "Egypt",
      teamName: "Liverpool",
      image: "https://example.com/salah.jpg",
      goals: 18,
    });
    expect(player?.name).toBe("Mohamed Salah");
    expect(player?.photoUrl).toBe("https://example.com/salah.jpg");
    expect(player?.currentClub).toBe("Liverpool");
    expect(player?.goals).toBe(18);
  });

  it("normalizes nested player payload", () => {
    const player = normalizePlDataPlayer({
      data: { player: { fullName: "Bukayo Saka", team: "Arsenal" } },
    });
    expect(player?.name).toBe("Bukayo Saka");
    expect(player?.currentClub).toBe("Arsenal");
  });

  it("normalizes team detail", () => {
    const team = normalizePlDataTeam({
      id: 1,
      name: "Arsenal",
      code: "ARS",
      crest: "https://example.com/arsenal.png",
      manager: "Arteta",
    });
    expect(team?.name).toBe("Arsenal");
    expect(team?.crestUrl).toBe("https://example.com/arsenal.png");
    expect(team?.manager).toBe("Arteta");
  });

  it("normalizes match list items", () => {
    const match = normalizePlDataMatch({
      id: 99,
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      homeScore: 2,
      awayScore: 1,
      status: "FT",
    });
    expect(match?.homeTeam).toBe("Arsenal");
    expect(match?.awayScore).toBe(1);
  });

  it("normalizes standings row", () => {
    const row = normalizePlDataStandingRow({
      position: 1,
      team: "Liverpool",
      played: 10,
      points: 25,
      goalDifference: 12,
    });
    expect(row?.position).toBe(1);
    expect(row?.points).toBe(25);
  });

  it("normalizes top scorers", () => {
    const scorer = normalizePlDataTopScorer({
      rank: 1,
      player: "Haaland",
      team: "Man City",
      goals: 20,
    });
    expect(scorer?.player).toBe("Haaland");
    expect(scorer?.goals).toBe(20);
  });
});
