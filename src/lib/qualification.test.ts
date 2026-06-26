import { describe, expect, it } from "vitest";
import {
  bucketQualificationTeams,
  computeQualificationStatus,
  groupStageComplete,
  isConfirmedTopTwo,
  maxPoints
} from "./qualification";
import type { GroupLetter, GroupStanding, TeamRecord } from "../types";

function row(
  teamId: string,
  group: GroupLetter,
  played: number,
  points: number,
  gd = 0
): TeamRecord {
  return {
    teamId,
    group,
    played,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: gd,
    points,
    conduct: 0,
    rating: 1500
  };
}

function standing(group: GroupLetter, rows: TeamRecord[]): GroupStanding {
  return { group, rows };
}

describe("qualification certainty", () => {
  it("marks projected leaders when third can still catch them", () => {
    const standings = [
      standing("A", [
        row("usa", "A", 2, 4),
        row("mex", "A", 2, 4),
        row("can", "A", 1, 3),
        row("jpn", "A", 2, 0)
      ])
    ];
    const usa = computeQualificationStatus("usa", standings);
    expect(usa.status).toBe("qualified");
    expect(usa.certainty).toBe("projected");
  });

  it("marks confirmed top two when third cannot catch points", () => {
    const standings = [
      standing("A", [
        row("usa", "A", 2, 7),
        row("mex", "A", 2, 6),
        row("can", "A", 2, 3),
        row("jpn", "A", 2, 0)
      ])
    ];
    expect(isConfirmedTopTwo(row("usa", "A", 2, 7), standings[0]!.rows)).toBe(true);
    expect(computeQualificationStatus("usa", standings).certainty).toBe("confirmed");
  });

  it("marks confirmed elimination when max points cannot reach third", () => {
    const standings = [
      standing("A", [
        row("usa", "A", 2, 6),
        row("mex", "A", 2, 6),
        row("can", "A", 2, 6),
        row("jpn", "A", 2, 0)
      ])
    ];
    expect(maxPoints(row("jpn", "A", 2, 0))).toBe(3);
    const jpn = computeQualificationStatus("jpn", standings);
    expect(jpn.status).toBe("eliminated");
    expect(jpn.certainty).toBe("confirmed");
  });

  it("buckets confirmed vs projected teams", () => {
    const standings = [
      standing("A", [
        row("usa", "A", 2, 7),
        row("mex", "A", 2, 4),
        row("can", "A", 2, 3),
        row("jpn", "A", 2, 0)
      ])
    ];
    const buckets = bucketQualificationTeams(["usa", "mex", "jpn"], standings);
    expect(buckets.confirmedThrough).toContain("usa");
    expect(buckets.projectedThrough).toContain("mex");
    expect(buckets.confirmedOut).toContain("jpn");
  });
});

describe("groupStageComplete", () => {
  it("true at 72 completed group matches", () => {
    const matches = Array.from({ length: 72 }, (_, i) => ({
      group: "A",
      status: "completed" as const,
      id: String(i)
    }));
    expect(groupStageComplete(matches)).toBe(true);
  });

  it("false below 72", () => {
    const matches = Array.from({ length: 71 }, () => ({
      group: "A",
      status: "completed" as const
    }));
    expect(groupStageComplete(matches)).toBe(false);
  });
});
