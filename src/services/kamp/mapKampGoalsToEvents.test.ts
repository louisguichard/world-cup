import { describe, expect, it } from "vitest";
import { buildCatalogTeam } from "../../data/wc2026TeamCatalog";
import { mapKampGoalsToEvents } from "./mapKampGoalsToEvents";

describe("mapKampGoalsToEvents", () => {
  const teams = {
    usa: buildCatalogTeam("USA", "D"),
    par: buildCatalogTeam("PAR", "D"),
  };

  it("maps regular goals to match events", () => {
    const events = mapKampGoalsToEvents(
      [{ team: "USA", player: "Folarin Balogun", minute: 31 }],
      "usa",
      "par",
      teams
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("goal");
    expect(events[0]?.playerName).toBe("Folarin Balogun");
    expect(events[0]?.teamId).toBe("usa");
    expect(events[0]?.providerId).toContain("kamp:");
  });

  it("maps own goals when contra is true", () => {
    const events = mapKampGoalsToEvents(
      [{ team: "USA", player: "Damián Bobadilla", minute: 7, contra: true }],
      "usa",
      "par",
      teams
    );
    expect(events[0]?.type).toBe("own_goal");
    expect(events[0]?.minute).toBe(7);
  });

  it("maps stoppage-time minutes to extra time", () => {
    const events = mapKampGoalsToEvents(
      [{ team: "CAN", player: "Stephen Eustáquio", minute: 92 }],
      "can",
      "rsa",
      { can: buildCatalogTeam("CAN"), rsa: buildCatalogTeam("RSA") }
    );
    expect(events[0]?.minute).toBe(90);
    expect(events[0]?.minuteExtra).toBe(2);
  });
});
