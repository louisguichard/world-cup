/**
 * Ingest → identity → qualification → push event shape (no live DB required).
 */

import { describe, expect, it } from "vitest";
import { IdentityService } from "../../../packages/identity/src/index";
import { computeGroupQualificationFromSharedEngine } from "../bc2/qualificationBridge.js";
import { QualificationChangedEventSchema } from "../../../packages/events/src/index.js";

describe("smoke: ingestToQualification", () => {
  it("resolves ESPN 229 to bra and computes group qualification", async () => {
    const aliases = new Map<string, unknown>();
    const repo = {
      async findAlias(providerId: string, externalId: string, entityType: string) {
        return aliases.get(`${providerId}:${externalId}:${entityType}`) ?? null;
      },
      async upsertAlias() {},
      async createQuarantine() {
        return "q";
      },
      async resolveQuarantine() {},
      async auditLog() {},
      async findCandidatesByName() {
        return [];
      },
    };

    aliases.set("espn:229:team", {
      id: "1",
      canonicalId: "bra",
      entityType: "team",
      providerId: "espn",
      externalId: "229",
      confidence: 1,
      method: "EXACT",
      quarantined: false,
    });

    const identity = new IdentityService(repo);
    const resolved = await identity.resolveToCanonical("espn", "229", "team");
    expect(resolved.resolved).toBe(true);
    expect(resolved.canonicalId).toBe("bra");

    const kickoff = new Date("2026-06-15T19:00:00Z");
    const matches = [
      {
        id: "m1",
        groupId: "C",
        homeTeamId: "bra",
        awayTeamId: "mar",
        homeScore: 2,
        awayScore: 0,
        resultLocked: true,
        kickoffUtc: kickoff,
      },
      {
        id: "m2",
        groupId: "C",
        homeTeamId: "bra",
        awayTeamId: "hai",
        homeScore: 1,
        awayScore: 1,
        resultLocked: true,
        kickoffUtc: kickoff,
      },
    ];

    const standings = [
      {
        teamId: "bra",
        groupId: "C",
        played: 2,
        won: 1,
        drawn: 1,
        lost: 0,
        goalsFor: 3,
        goalsAgainst: 1,
        points: 4,
        goalDifference: 2,
      },
      {
        teamId: "mar",
        groupId: "C",
        played: 2,
        won: 1,
        drawn: 0,
        lost: 1,
        goalsFor: 2,
        goalsAgainst: 2,
        points: 3,
        goalDifference: 0,
      },
      {
        teamId: "hai",
        groupId: "C",
        played: 2,
        won: 0,
        drawn: 1,
        lost: 1,
        goalsFor: 1,
        goalsAgainst: 2,
        points: 1,
        goalDifference: -1,
      },
      {
        teamId: "sco",
        groupId: "C",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        goalDifference: 0,
      },
    ];

    const qual = computeGroupQualificationFromSharedEngine("C", standings, matches);
    const bra = qual.find((row) => row.teamId === "bra");
    expect(bra?.tier).toBe("CHAMPION");
    expect(bra?.lifeState).toBe("ALIVE");

    const pushPayload = {
      type: "QualificationChangedEvent" as const,
      teamId: "bra",
      groupId: "C",
      previousTier: null,
      newTier: "qualified" as const,
      previousCertainty: null,
      newCertainty: "CONFIRMED",
      changedAt: new Date().toISOString(),
    };

    const parsed = QualificationChangedEventSchema.safeParse(pushPayload);
    expect(parsed.success).toBe(true);
  });
});
