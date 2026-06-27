import { describe, expect, it } from "vitest";
import { APP_COPY } from "./appCopy";
import {
  bubbleStateLabel,
  crossedCutoffForDelta,
  detectCutoffCrossings,
  getBestThirdBubbleTeamIds,
  getThirdPlaceBubbleState,
  matchInvolvesBestThirdBubble,
} from "./thirdPlaceLiveStatus";
import type { GroupStanding, TeamRecord } from "../types";
import { rankAliveBestThirds } from "./bestThirds";

const context = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} };

function record(
  teamId: string,
  group: "A" | "B",
  points: number,
  gd: number,
  played = 3
): TeamRecord {
  return {
    teamId,
    group,
    played,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: gd > 0 ? gd : 0,
    goalsAgainst: 0,
    goalDifference: gd,
    points,
    conduct: 0,
    rating: 1500,
  };
}

function standingsWithThirds(): GroupStanding[] {
  return [
    {
      group: "A",
      rows: [
        record("a1", "A", 9, 5),
        record("a2", "A", 6, 2),
        record("a3", "A", 4, 0),
        record("a4", "A", 1, -3),
      ],
    },
    {
      group: "B",
      rows: [
        record("b1", "B", 9, 4),
        record("b2", "B", 6, 1),
        record("b3", "B", 3, -1),
        record("b4", "B", 0, -4),
      ],
    },
  ];
}

describe("thirdPlaceLiveStatus", () => {
  describe("detectCutoffCrossings", () => {
    it("detects team entering top 8", () => {
      const prev = Array.from({ length: 10 }, (_, i) => record(`t${i}`, "A", 10 - i, i));
      const next = [...prev];
      const moved = next[9]!;
      next.splice(9, 1);
      next.splice(6, 0, moved);

      const crossings = detectCutoffCrossings(prev, next);
      expect(crossings.some((c) => c.teamId === "t9" && c.direction === "in")).toBe(true);
    });

    it("detects team leaving top 8", () => {
      const prev = Array.from({ length: 10 }, (_, i) => record(`t${i}`, "A", 10 - i, i));
      const next = [...prev];
      const moved = next[7]!;
      next.splice(7, 1);
      next.splice(9, 0, moved);

      const crossings = detectCutoffCrossings(prev, next);
      expect(crossings.some((c) => c.teamId === "t7" && c.direction === "out")).toBe(true);
    });
  });

  describe("crossedCutoffForDelta", () => {
    it("returns in when moving from 9 to 8", () => {
      expect(crossedCutoffForDelta(9, 8)).toBe("in");
    });

    it("returns out when moving from 8 to 9", () => {
      expect(crossedCutoffForDelta(8, 9)).toBe("out");
    });

    it("returns undefined when staying inside top 8", () => {
      expect(crossedCutoffForDelta(3, 2)).toBeUndefined();
    });
  });

  describe("getThirdPlaceBubbleState", () => {
    it("returns safe for top-8 third with complete group", () => {
      const ranked = [record("a3", "A", 6, 2), record("b3", "B", 5, 1)];
      const standings = standingsWithThirds();
      expect(getThirdPlaceBubbleState("a3", 1, ranked, standings, context)).toBe("safe");
    });

    it("returns bubble for rank 9 within striking distance", () => {
      const ranked = [
        ...Array.from({ length: 8 }, (_, i) => record(`t${i}`, "A", 8, i)),
        record("b3", "B", 7, 0),
      ];
      const standings = standingsWithThirds();
      expect(getThirdPlaceBubbleState("b3", 9, ranked, standings, context)).toBe("bubble");
    });

    it("returns outside for rank far below cutoff", () => {
      const ranked = [
        ...Array.from({ length: 10 }, (_, i) => record(`t${i}`, "A", 9 - Math.floor(i / 2), i)),
        record("b3", "B", 1, -5),
        record("x1", "A", 0, -6),
      ];
      const standings = standingsWithThirds();
      expect(getThirdPlaceBubbleState("b3", 11, ranked, standings, context)).toBe("outside");
    });
  });

  describe("bubbleStateLabel", () => {
    it("maps states to labels", () => {
      expect(bubbleStateLabel("safe")).toBe(APP_COPY.bestThird.safe);
      expect(bubbleStateLabel("bubble")).toBe(APP_COPY.bestThird.bubble);
      expect(bubbleStateLabel("outside")).toBe(APP_COPY.bestThird.outside);
    });
  });

  describe("getBestThirdBubbleTeamIds", () => {
    it("returns only teams in bubble state", () => {
      const standings = standingsWithThirds();
      const ids = getBestThirdBubbleTeamIds(standings, context);
      const ranked = rankAliveBestThirds(standings, context);
      for (const id of ids) {
        const rank = ranked.findIndex((r) => r.teamId === id) + 1;
        expect(getThirdPlaceBubbleState(id, rank, ranked, standings, context)).toBe("bubble");
      }
    });
  });

  describe("matchInvolvesBestThirdBubble", () => {
    it("detects bubble teams in a fixture", () => {
      const bubbleIds = new Set(["home-bubble"]);
      expect(matchInvolvesBestThirdBubble({ homeTeamId: "home-bubble", awayTeamId: "x" }, bubbleIds)).toBe(true);
      expect(matchInvolvesBestThirdBubble({ homeTeamId: "a", awayTeamId: "b" }, bubbleIds)).toBe(false);
    });
  });
});
