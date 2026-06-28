import { describe, expect, it, vi } from "vitest";
import { IdentityService } from "./index.js";
import type { IdentityRepository } from "./index.js";
import type { EntityType, IdentityAlias } from "@wc2026/canonical";

function mockRepo(overrides: Partial<IdentityRepository> = {}): IdentityRepository {
  const aliases = new Map<string, IdentityAlias>();
  return {
    findAlias: vi.fn(async (providerId, externalId, entityType) => {
      const key = `${providerId}:${externalId}:${entityType}`;
      return aliases.get(key) ?? null;
    }),
    upsertAlias: vi.fn(async (alias) => {
      const key = `${alias.providerId}:${alias.externalId}:${alias.entityType}`;
      aliases.set(key, { ...alias, id: "alias-1" });
    }),
    createQuarantine: vi.fn(async () => "q-1"),
    resolveQuarantine: vi.fn(async () => {}),
    auditLog: vi.fn(async () => {}),
    findCandidatesByName: vi.fn(async () => []),
    ...overrides,
  };
}

describe("IdentityService", () => {
  it("exact match resolves instantly", async () => {
    const repo = mockRepo({
      findAlias: vi.fn(async () => ({
        id: "a1",
        canonicalId: "team:mex",
        entityType: "team" as EntityType,
        providerId: "espn",
        externalId: "123",
        confidence: 1,
        method: "EXACT",
        quarantined: false,
      })),
    });
    const svc = new IdentityService(repo);
    const result = await svc.resolveToCanonical("espn", "123", "team");
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.canonicalId).toBe("team:mex");
      expect(result.method).toBe("EXACT");
    }
  });

  it("fuzzy below threshold goes to quarantine", async () => {
    const repo = mockRepo({
      findCandidatesByName: vi.fn(async () => [{ canonicalId: "team:arg", score: 0.6 }]),
    });
    const svc = new IdentityService(repo);
    const result = await svc.resolveToCanonical("sofascore", "99234", "player", "Amallah");
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.quarantineId).toBe("q-1");
      expect(result.topScore).toBe(0.6);
    }
  });

  it("manual confirm via confirmQuarantine adds alias", async () => {
    const repo = mockRepo();
    const svc = new IdentityService(repo);
    await svc.confirmQuarantine("q-1", "player:amallah", "admin-1", "sofascore", "99234", "player");
    expect(repo.upsertAlias).toHaveBeenCalled();
    expect(repo.resolveQuarantine).toHaveBeenCalledWith("q-1", "APPROVED", "admin-1");
  });

  it("duplicate alias attempt is idempotent via upsert", async () => {
    const repo = mockRepo();
    const svc = new IdentityService(repo);
    const input = {
      canonicalId: "team:usa",
      entityType: "team" as EntityType,
      providerId: "espn",
      externalId: "456",
      confidence: 1,
      method: "EXACT" as const,
      quarantined: false,
    };
    await svc.addAlias(input);
    await svc.addAlias(input);
    expect(repo.upsertAlias).toHaveBeenCalledTimes(2);
  });
});
