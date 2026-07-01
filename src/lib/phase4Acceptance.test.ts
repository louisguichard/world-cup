import { describe, expect, it } from "vitest";
import { isBootReady, markBootReady, resetBootReady } from "./bootReady";
import {
  buildCompletedResultsViewModel,
  matchResultStableId,
} from "./buildCompletedResultsViewModel";
import { buildConfirmedOnlyBracket } from "./brackets/buildConfirmedOnlyBracket";
import { buildBracketViewModel } from "./brackets/buildBracketViewModel";
import { resolveDownstreamSlotDisplay } from "./brackets/resolveLiveBracketContext";
import { commitLiveMatchStore } from "./commitLiveMatchStore";
import type { BracketMatch, Match, MergedMatch, Team, TeamRecord } from "../types";

function team(id: string, group: Team["group"] = "F"): Team {
  return {
    id,
    name: id,
    shortName: id,
    abbreviation: id.toUpperCase().slice(0, 3),
    group,
    logo: "",
    rating: 80,
  };
}

function row(teamId: string, group: Team["group"], points: number): TeamRecord {
  return {
    teamId,
    group,
    played: 3,
    wins: 1,
    draws: 0,
    losses: 2,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
    points,
    conduct: 0,
  };
}

const teams: Record<string, Team> = {
  ned: team("ned", "F"),
  mar: team("mar", "C"),
  ger: team("ger", "E"),
  par: team("par", "F"),
  fra: team("fra", "I"),
};

function lockedM76MoroccoWin(): MergedMatch {
  return {
    id: "M76",
    matchId: "M76",
    homeTeamId: "ned",
    awayTeamId: "mar",
    date: "2026-06-30T01:00:00Z",
    status: "completed",
    locked: true,
    source: "espn",
    homeScore: 1,
    awayScore: 1,
    penaltyShootout: { homeScore: 2, awayScore: 3 },
    homeConduct: 0,
    awayConduct: 0,
    stage: "R32",
  };
}

const m90QualContext = {
  lockedGroupMatchCount: {},
  lockedStandingsByGroup: {
    F: [row("ned", "F", 9), row("par", "F", 6), row("hai", "F", 3), row("swe", "F", 0)],
    C: [row("mar", "C", 9), row("bra", "C", 6), row("crc", "C", 3), row("cuw", "C", 0)],
    E: [row("ger", "E", 9), row("crc", "E", 6), row("cuw", "E", 3), row("civ", "E", 0)],
  },
};

/**
 * Phase 4 release gate — maps to manual QA in docs/phase-4-qa-checklist.md
 */
describe("Phase 4 acceptance gate", () => {
  describe("1 — locked knockout survives boot enrichment + poll stale merge", () => {
    it("keeps M76 Morocco win after sequential stale writes", () => {
      let store: Record<string, MergedMatch> = { M76: lockedM76MoroccoWin() };

      const bootEnrichmentStale: Record<string, MergedMatch> = {
        M76: {
          ...lockedM76MoroccoWin(),
          locked: false,
          homeScore: 2,
          awayScore: 1,
          penaltyShootout: undefined,
        },
      };
      store = commitLiveMatchStore(store, bootEnrichmentStale, teams).merged;

      const pollStale: Record<string, MergedMatch> = {
        M76: {
          ...lockedM76MoroccoWin(),
          locked: false,
          homeScore: 2,
          awayScore: 1,
          source: "espn",
        },
        espn760488: {
          id: "760488",
          espnEventId: "760488",
          homeTeamId: "ned",
          awayTeamId: "mar",
          date: "2026-07-03T18:00:00Z",
          status: "completed",
          locked: false,
          homeScore: 2,
          awayScore: 1,
          homeConduct: 0,
          awayConduct: 0,
          source: "espn",
        },
      };
      store = commitLiveMatchStore(store, pollStale, teams).merged;

      const m76Row = store.M76 ?? Object.values(store).find((m) => m.matchId === "M76");
      expect(m76Row?.locked).toBe(true);
      expect(m76Row?.penaltyShootout).toEqual({ homeScore: 2, awayScore: 3, home: [], away: [] });
      expect(m76Row?.homeScore).toBe(1);
      expect(m76Row?.awayScore).toBe(1);
    });
  });

  describe("2 — Live recent and Results tab share canonical completed list", () => {
    it("returns identical match ids and scores", () => {
      const liveMatches: Record<string, MergedMatch> = {
        M76: lockedM76MoroccoWin(),
        espn760488: {
          id: "760488",
          espnEventId: "760488",
          homeTeamId: "ned",
          awayTeamId: "mar",
          date: "2026-07-03T18:00:00Z",
          status: "completed",
          locked: false,
          homeScore: 2,
          awayScore: 1,
          homeConduct: 0,
          awayConduct: 0,
          source: "espn",
        },
      };

      const recent = buildCompletedResultsViewModel(liveMatches, teams, { sort: "recent" });
      const results = buildCompletedResultsViewModel(liveMatches, teams, {
        sort: "recent",
        filters: { sort: "recent", stage: "all", group: "all", search: "" },
      });

      expect(recent.map(matchResultStableId)).toEqual(results.map(matchResultStableId));
      expect(recent.map((m) => [m.homeScore, m.awayScore])).toEqual(
        results.map((m) => [m.homeScore, m.awayScore])
      );
    });
  });

  describe("3 — Bracket confirmed tree shows feeder winner in downstream R16", () => {
    const bracketTeams = [
      team("ned", "F"),
      team("mar", "C"),
      team("por", "K"),
      team("ita", "I"),
      team("ger", "E"),
      team("par", "F"),
    ];

    it("places Morocco not Netherlands in M90 from locked M76", () => {
      const liveMatches: Record<string, MergedMatch> = { M76: lockedM76MoroccoWin() };
      const { bracket } = buildConfirmedOnlyBracket(
        bracketTeams,
        [] as Match[],
        liveMatches,
        m90QualContext
      );

      const m90 = bracket.find((slot) => slot.id === "M90");
      expect(m90?.awayTeamId).toBe("mar");
      expect(m90?.awayTeamId).not.toBe("ned");
    });

    it("buildBracketViewModel confirmed tab matches locked feeder propagation", () => {
      const liveMatches: Record<string, MergedMatch> = { M76: lockedM76MoroccoWin() };
      const viewModel = buildBracketViewModel({
        mode: "confirmed",
        context: "tab",
        teams: bracketTeams,
        matches: [],
        liveMatches,
        qualContext: m90QualContext,
      });

      const m90 = viewModel.bracket.find((slot) => slot.id === "M90");
      expect(m90?.awayTeamId).toBe("mar");
    });
  });

  describe("4 — polling gated until boot ready", () => {
    it("starts blocked until markBootReady", () => {
      resetBootReady();
      expect(isBootReady()).toBe(false);
      markBootReady();
      expect(isBootReady()).toBe(true);
    });
  });

  describe("5 — eliminated feeder loser not promoted to downstream slot", () => {
    it("resolveDownstreamSlotDisplay uses locked winner not stale bracket row", () => {
      const staleR16: BracketMatch = {
        id: "M90",
        stage: "R16",
        label: "M90",
        homeTeamId: "ned",
        awayTeamId: "fra",
        homeSeedLabel: "W75",
        awaySeedLabel: "W76",
        source: "simulated",
      };

      const liveMatches: Record<string, MergedMatch> = { M76: lockedM76MoroccoWin() };
      const display = resolveDownstreamSlotDisplay(staleR16, liveMatches, teams);

      expect(display.awayTeamId).toBe("mar");
      expect(display.awayTeamId).not.toBe("ned");
    });
  });
});
