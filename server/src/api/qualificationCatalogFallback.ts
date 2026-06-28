/**
 * Compute-on-read qualification for local dev when Postgres/Redis are unavailable.
 * Uses official group roster + zeroed standings (pre-tournament baseline).
 */

import type { GroupLetter } from "../../../src/types.js";
import { OFFICIAL_GROUP_ASSIGNMENTS } from "../../../src/data/officialGroupAssignments.js";
import { computeGroupQualificationFromSharedEngine } from "../bc2/qualificationBridge.js";
import { QUALIFICATION_ENGINE_VERSION } from "../../../packages/qualification/src/engineVersion.js";
import type { QualificationGroupResponse } from "./qualification.js";

export function getCatalogQualificationFallback(
  groupId: string
): QualificationGroupResponse | null {
  const roster = OFFICIAL_GROUP_ASSIGNMENTS[groupId as GroupLetter];
  if (!roster) return null;

  const standings = roster.map((teamId) => ({
    teamId,
    groupId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    goalDifference: 0,
  }));

  const qualifications = computeGroupQualificationFromSharedEngine(
    groupId,
    standings,
    []
  );

  return {
    groupId,
    asOf: new Date().toISOString(),
    source: "computed",
    teams: qualifications.map((q) => ({
      teamId: q.teamId,
      tier: q.tier,
      certainty: q.certainty,
      lifeState: q.lifeState,
      projectionScore: q.projectionScore ?? null,
      reasons: q.reasons,
      engineVersion: QUALIFICATION_ENGINE_VERSION,
    })),
  };
}
