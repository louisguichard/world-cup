import { describe, expect, it } from "vitest";
import { buildTeamHistoricalFacts } from "./teamHistoricalFacts";
import type { Team } from "../types";

const brazil: Team = {
  id: "bra",
  name: "Brazil",
  abbreviation: "BRA",
  group: "D",
  fifaRank: 1,
  confederation: "CONMEBOL",
  rating: 2000,
};

describe("buildTeamHistoricalFacts", () => {
  it("includes World Cup titles for Brazil", () => {
    const { facts, hasNotable } = buildTeamHistoricalFacts(brazil);
    expect(hasNotable).toBe(true);
    expect(facts.some((f) => f.id === "wc-titles")).toBe(true);
  });

  it("returns no notable history for unknown team", () => {
    const obscure: Team = { ...brazil, id: "xxx", name: "Atlantis FC" };
    const { hasNotable } = buildTeamHistoricalFacts(obscure);
    expect(hasNotable).toBe(false);
  });
});
