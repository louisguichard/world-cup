import { describe, expect, it } from "vitest";
import {
  auditProjectionViolations,
  computeQualificationStatus,
} from "./qualification";
import { rankAliveBestThirds } from "./thirdPlaceQualification";
import { loadEspnAuditDatasetFromFile } from "./espnAuditSnapshot";

describe("frozen ESPN snapshot — projection audit", () => {
  const { teams, matches, standings, context } = loadEspnAuditDatasetFromFile(
    new URL("../../.cursor/audit-espn-snapshot.json", import.meta.url)
  );
  const teamIds = Object.values(teams)
    .filter((team) => team.id === team.id.toLowerCase())
    .map((team) => team.id);

  it("has no projection violations", () => {
    const violations = auditProjectionViolations(teamIds, standings, context);
    expect(violations).toEqual([]);
  });

  it("does not mark best-eight thirds as projected_out", () => {
    const aliveBest = rankAliveBestThirds(standings, context);
    const topEight = aliveBest.slice(0, 8);

    expect(topEight.length).toBe(8);
    expect(topEight.every((row) => row.played > 0)).toBe(true);

    for (const row of topEight) {
      const qual = computeQualificationStatus(row.teamId, standings, context);
      expect(qual.status, `${row.teamId} rank ${aliveBest.indexOf(row) + 1}`).not.toBe("projected_out");
      expect(qual.canQualify).toBe(true);
      expect(qual.projectionScore).toBeGreaterThan(0);
    }
  });

  it("eliminated teams have projectionScore 0", () => {
    for (const teamId of teamIds) {
      const qual = computeQualificationStatus(teamId, standings, context);
      if (!qual.canQualify) {
        expect(qual.projectionScore, teamId).toBe(0);
        expect(qual.lifeState, teamId).toBe("eliminated");
      }
    }
  });
});
