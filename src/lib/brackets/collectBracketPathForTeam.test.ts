import { describe, expect, it } from "vitest";
import type { BracketMatch, MergedMatch } from "../../types";
import {
  collectBracketPathForTeam,
  findTeamBracketAnchorMatches,
  resolveFollowedTeamFocusStage,
  teamAppearsInBracketMatch,
} from "./collectBracketPathForTeam";

function slot(
  id: string,
  stage: BracketMatch["stage"],
  homeTeamId?: string,
  awayTeamId?: string
): BracketMatch {
  return {
    id,
    stage,
    label: id,
    homeTeamId,
    awayTeamId,
    homeCertainty: homeTeamId ? "confirmed" : "tbd",
    awayCertainty: awayTeamId ? "confirmed" : "tbd",
    source: "scheduled",
  };
}

describe("collectBracketPathForTeam", () => {
  const bracket: BracketMatch[] = [
    slot("M76", "R32", "ned", "usa"),
    slot("M88", "R32", "mor", "bra"),
    slot("M90", "R16", "ned", "mor"),
    slot("M97", "QF"),
    slot("M101", "SF"),
    slot("M104", "Final"),
  ];

  it("detects team presence in knockout slots", () => {
    expect(teamAppearsInBracketMatch("ned", slot("M76", "R32", "ned", "usa"))).toBe(true);
    expect(teamAppearsInBracketMatch("ned", slot("M88", "R32", "mor", "bra"))).toBe(false);
  });

  it("finds anchor matches for a team across rounds", () => {
    expect(findTeamBracketAnchorMatches("ned", bracket).map((m) => m.id)).toEqual(["M76", "M90"]);
  });

  it("includes forward path while the team is still alive", () => {
    const path = collectBracketPathForTeam("ned", bracket, {}, { ned: { id: "ned" } as never });
    expect([...path].sort()).toEqual(["M101", "M104", "M75", "M76", "M90", "M97"]);
  });

  it("stops forward path after a locked elimination", () => {
    const liveMatches: Record<string, MergedMatch> = {
      M90: {
        id: "M90",
        matchId: "M90",
        homeTeamId: "ned",
        awayTeamId: "mor",
        status: "completed",
        locked: true,
        homeScore: 1,
        awayScore: 2,
      } as MergedMatch,
    };

    const path = collectBracketPathForTeam("ned", bracket, liveMatches, {
      ned: { id: "ned" } as never,
      mor: { id: "mor" } as never,
    });

    expect(path.has("M76")).toBe(true);
    expect(path.has("M90")).toBe(true);
    expect(path.has("M97")).toBe(false);
    expect(path.has("M104")).toBe(false);
  });

  it("focuses the most advanced stage containing the team", () => {
    const ordered = {
      R32: [slot("M76", "R32", "ned", "usa")],
      R16: [slot("M90", "R16", "ned", "mor")],
      QF: [slot("M97", "QF")],
      SF: [slot("M101", "SF")],
      ThirdPlace: [],
      Final: [slot("M104", "Final")],
    };

    expect(resolveFollowedTeamFocusStage("ned", ["R32", "R16", "QF"], ordered)).toBe("R16");
  });
});
