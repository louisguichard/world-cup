import { describe, expect, it } from "vitest";
import { buildAppHash, buildMatchHash, buildTournamentHash, buildVenueHash, parseAppHash } from "./useHashSync";

describe("parseAppHash", () => {
  describe("standard tabs", () => {
    it("parses main tabs", () => {
      expect(parseAppHash("#live")).toMatchObject({ tab: "live", matchId: null });
      expect(parseAppHash("#results")).toMatchObject({ tab: "results", matchId: null });
      expect(parseAppHash("#groups")).toMatchObject({ tab: "groups", matchId: null });
      expect(parseAppHash("#schedule")).toMatchObject({ tab: "schedule", matchId: null });
    });

    it("defaults unknown tab to live", () => {
      expect(parseAppHash("#unknown")).toMatchObject({ tab: "live" });
      expect(parseAppHash("")).toMatchObject({ tab: "live" });
    });

    it("parses simulator sub-routes", () => {
      expect(parseAppHash("#simulator")).toMatchObject({
        tab: "simulator",
        simulatorMode: "tournament"
      });
      expect(parseAppHash("#simulator/probabilities")).toMatchObject({
        tab: "simulator",
        simulatorMode: "probabilities"
      });
      expect(parseAppHash("#simulator/methodology")).toMatchObject({
        tab: "simulator",
        simulatorMode: "methodology"
      });
    });
  });

  describe("match detail routes", () => {
    it("parses #match/{id} as match detail", () => {
      const parsed = parseAppHash("#match/M89");
      expect(parsed.matchId).toBe("M89");
      expect(parsed.matchTab).toBe("summary");
      expect(parsed.tab).toBe("live");
    });

    it("parses #match/{id}/{tab}", () => {
      expect(parseAppHash("#match/M1/statistics")).toMatchObject({
        matchId: "M1",
        matchTab: "statistics"
      });
      expect(parseAppHash("#match/M1/lineups")).toMatchObject({
        matchId: "M1",
        matchTab: "lineups"
      });
      expect(parseAppHash("#match/M1/commentary")).toMatchObject({
        matchId: "M1",
        matchTab: "commentary"
      });
      expect(parseAppHash("#match/M1/h2h")).toMatchObject({
        matchId: "M1",
        matchTab: "h2h"
      });
    });

    it("defaults invalid match tab to summary", () => {
      expect(parseAppHash("#match/M1/invalid")).toMatchObject({
        matchId: "M1",
        matchTab: "summary"
      });
    });
  });

  describe("venue routes", () => {
    it("parses #venue/{slug}", () => {
      expect(parseAppHash("#venue/los-angeles")).toMatchObject({
        venueSlug: "los-angeles",
        matchId: null,
        tab: "live"
      });
    });

    it("returns null venueSlug for standard tabs", () => {
      expect(parseAppHash("#live").venueSlug).toBeNull();
    });
  });

  describe("tournament routes", () => {
    it("parses #tournament as tournament tab with matches sub-tab", () => {
      const parsed = parseAppHash("#tournament");
      expect(parsed.tab).toBe("tournament");
      expect(parsed.tournamentSubTab).toBe("matches");
      expect(parsed.matchId).toBeNull();
    });

    it("parses #tournament/{subTab}", () => {
      expect(parseAppHash("#tournament/standings")).toMatchObject({
        tab: "tournament",
        tournamentSubTab: "standings"
      });
      expect(parseAppHash("#tournament/bracket")).toMatchObject({
        tab: "tournament",
        tournamentSubTab: "bracket"
      });
      expect(parseAppHash("#tournament/stats")).toMatchObject({
        tab: "tournament",
        tournamentSubTab: "stats"
      });
    });

    it("defaults invalid tournament sub-tab to matches", () => {
      expect(parseAppHash("#tournament/invalid")).toMatchObject({
        tab: "tournament",
        tournamentSubTab: "matches"
      });
    });

    it("parses date query parameter", () => {
      const parsed = parseAppHash("#tournament/matches?date=2026-06-25");
      expect(parsed.tab).toBe("tournament");
      expect(parsed.tournamentSubTab).toBe("matches");
      expect(parsed.dateKey).toBe("2026-06-25");
    });

    it("ignores date query on non-matches sub-tabs", () => {
      const parsed = parseAppHash("#tournament/standings?date=2026-06-25");
      expect(parsed.dateKey).toBeNull();
    });
  });
});

describe("buildAppHash", () => {
  it("builds hashes for standard tabs", () => {
    expect(buildAppHash("live", "tournament")).toBe("#live");
    expect(buildAppHash("results", "tournament")).toBe("#results");
    expect(buildAppHash("tournament", "tournament")).toBe("#tournament");
  });

  it("builds hashes for simulator modes", () => {
    expect(buildAppHash("simulator", "tournament")).toBe("#simulator");
    expect(buildAppHash("simulator", "probabilities")).toBe("#simulator/probabilities");
    expect(buildAppHash("live", "methodology")).toBe("#live");
  });
});

describe("buildMatchHash", () => {
  it("builds match detail hash without tab", () => {
    expect(buildMatchHash("M89")).toBe("#match/M89");
  });

  it("omits tab when it is summary (default)", () => {
    expect(buildMatchHash("M89", "summary")).toBe("#match/M89");
  });

  it("includes non-default tab in hash", () => {
    expect(buildMatchHash("M89", "statistics")).toBe("#match/M89/statistics");
    expect(buildMatchHash("M89", "lineups")).toBe("#match/M89/lineups");
  });
});

describe("buildTournamentHash", () => {
  it("builds base tournament hash", () => {
    expect(buildTournamentHash()).toBe("#tournament");
    expect(buildTournamentHash("matches")).toBe("#tournament");
  });

  it("includes non-matches sub-tabs", () => {
    expect(buildTournamentHash("standings")).toBe("#tournament/standings");
    expect(buildTournamentHash("bracket")).toBe("#tournament/bracket");
    expect(buildTournamentHash("stats")).toBe("#tournament/stats");
  });

  it("appends date query for matches sub-tab", () => {
    expect(buildTournamentHash("matches", "2026-06-25")).toBe("#tournament?date=2026-06-25");
  });

  it("does not append date for non-matches sub-tabs", () => {
    expect(buildTournamentHash("standings", "2026-06-25")).toBe("#tournament/standings");
  });
});

describe("buildVenueHash", () => {
  it("builds venue hub hash", () => {
    expect(buildVenueHash("los-angeles")).toBe("#venue/los-angeles");
    expect(buildVenueHash("mexico-city")).toBe("#venue/mexico-city");
  });
});
