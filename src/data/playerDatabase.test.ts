import { describe, expect, it } from "vitest";
import {
  ensurePlayerDatabase,
  getPlayerByName,
  getSquadByTeamId,
  resetPlayerDatabaseForTests,
} from "./playerDatabase";

describe("playerDatabase", () => {
  it("loads bundled snapshot and resolves players by name", async () => {
    resetPlayerDatabaseForTests();
    await ensurePlayerDatabase();

    const hit = getPlayerByName("Mohamed Salah");
    expect(hit?.name).toBe("Mohamed Salah");
    expect(hit?.goals).toBeGreaterThan(0);
  });

  it("returns squad players sorted by rating for team id", async () => {
    resetPlayerDatabaseForTests();
    await ensurePlayerDatabase();

    const squad = getSquadByTeamId("alg");
    expect(squad.length).toBeGreaterThan(0);
    expect(squad[0]!.rating).toBeGreaterThanOrEqual(squad[squad.length - 1]!.rating);
  });

  it("fuzzy-matches by last name", async () => {
    resetPlayerDatabaseForTests();
    await ensurePlayerDatabase();

    const hit = getPlayerByName("Salah");
    expect(hit?.name.toLowerCase()).toContain("salah");
  });
});
