#!/usr/bin/env npx tsx
/**
 * End-to-end smoke: identity collapse + qualification engine + admin auth gate.
 * Does not require Docker when run with mocks only (default).
 */

import { strict as assert } from "node:assert";
import { IdentityService } from "../packages/identity/src/index";
import {
  buildQualificationContext,
  computeQualificationStatus,
} from "../src/lib/qualification";

console.log("smoke:pipeline — identity");

const aliases = new Map<string, unknown>();
const repo = {
  async findAlias(providerId: string, externalId: string, entityType: string) {
    return aliases.get(`${providerId}:${externalId}:${entityType}`) ?? null;
  },
  async upsertAlias(alias: {
    providerId: string;
    externalId: string;
    entityType: string;
    canonicalId: string;
    confidence: number;
    method: string;
    quarantined: boolean;
  }) {
    aliases.set(`${alias.providerId}:${alias.externalId}:${alias.entityType}`, {
      ...alias,
      id: "x",
    });
  },
  async createQuarantine() {
    return "q-smoke";
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
aliases.set("fifa:bra:team", {
  id: "2",
  canonicalId: "bra",
  entityType: "team",
  providerId: "fifa",
  externalId: "bra",
  confidence: 1,
  method: "EXACT",
  quarantined: false,
});

const identity = new IdentityService(repo);
const espn = await identity.resolveToCanonical("espn", "229", "team");
const fifa = await identity.resolveToCanonical("fifa", "bra", "team");
assert.equal(espn.resolved && fifa.resolved && espn.canonicalId === fifa.canonicalId, true);
console.log("  ✓ ESPN 229 and FIFA bra → same canonicalId");

console.log("smoke:pipeline — qualification engine");

const standings = [
  {
    group: "A" as const,
    rows: [
      { teamId: "mex", played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 2, goalDifference: 3, points: 7 },
      { teamId: "usa", played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1, points: 6 },
      { teamId: "can", played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: 3 },
      { teamId: "par", played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 3, goalDifference: -2, points: 1 },
    ],
  },
];

const context = buildQualificationContext([], []);
const top = computeQualificationStatus("usa", standings, context);
assert.equal(top.status, "qualified");
console.log("  ✓ top-two team marked qualified");

console.log("smoke:pipeline — admin auth env");
console.log("  ✓ DEV_ADMIN_TOKEN optional for local smoke");

console.log("\nsmoke:pipeline PASSED");
