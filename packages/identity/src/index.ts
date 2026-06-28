/**
 * @wc2026/identity — injectable identity resolution service.
 * Database operations are abstracted behind IdentityRepository for testability.
 */

import type {
  EntityType,
  IdentityAlias,
  QuarantineEntry,
  ResolutionMethod,
} from "@wc2026/canonical";

export type ResolutionResult =
  | { resolved: true; canonicalId: string; method: ResolutionMethod; confidence: number }
  | { resolved: false; quarantineId: string; topScore: number; candidates: string[] };

export interface IdentityRepository {
  findAlias(
    providerId: string,
    externalId: string,
    entityType: EntityType
  ): Promise<IdentityAlias | null>;
  upsertAlias(alias: Omit<IdentityAlias, "id">): Promise<void>;
  createQuarantine(entry: Omit<QuarantineEntry, "id" | "createdAt">): Promise<string>;
  resolveQuarantine(
    id: string,
    resolution: "APPROVED" | "REJECTED" | "NEW_ENTITY",
    resolvedBy: string
  ): Promise<void>;
  auditLog(entry: {
    canonicalId: string;
    entityType: EntityType;
    action: string;
    providerId?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  findCandidatesByName(
    entityType: EntityType,
    displayName: string
  ): Promise<Array<{ canonicalId: string; score: number }>>;
}

export class IdentityService {
  private readonly FUZZY_THRESHOLD = 0.85;

  constructor(private readonly repo: IdentityRepository) {}

  async resolveToCanonical(
    providerId: string,
    externalId: string,
    entityType: EntityType,
    displayName?: string
  ): Promise<ResolutionResult> {
    const alias = await this.repo.findAlias(providerId, externalId, entityType);
    if (alias && !alias.quarantined) {
      await this.repo.auditLog({
        canonicalId: alias.canonicalId,
        entityType,
        action: "RESOLVED",
        providerId,
        externalId,
      });
      return {
        resolved: true,
        canonicalId: alias.canonicalId,
        method: alias.method,
        confidence: alias.confidence,
      };
    }

    if (displayName) {
      const candidates = await this.repo.findCandidatesByName(entityType, displayName);
      const best = candidates[0];
      if (best && best.score >= this.FUZZY_THRESHOLD) {
        await this.addAlias({
          canonicalId: best.canonicalId,
          entityType,
          providerId,
          externalId,
          externalDisplayName: displayName,
          confidence: best.score,
          method: "FUZZY",
          quarantined: false,
        });
        return {
          resolved: true,
          canonicalId: best.canonicalId,
          method: "FUZZY",
          confidence: best.score,
        };
      }
      if (best) {
        const quarantineId = await this.repo.createQuarantine({
          externalId,
          entityType,
          providerId,
          rawPayload: { displayName },
          candidateIds: candidates.map((c) => c.canonicalId),
          topScore: best.score,
          reason: `Fuzzy score ${best.score.toFixed(2)} below threshold ${this.FUZZY_THRESHOLD}`,
        });
        return {
          resolved: false,
          quarantineId,
          topScore: best.score,
          candidates: candidates.map((c) => c.canonicalId),
        };
      }
    }

    const quarantineId = await this.repo.createQuarantine({
      externalId,
      entityType,
      providerId,
      rawPayload: { displayName: displayName ?? externalId },
      candidateIds: [],
      topScore: 0,
      reason: "No canonical match found",
    });
    return { resolved: false, quarantineId, topScore: 0, candidates: [] };
  }

  async addAlias(input: {
    canonicalId: string;
    entityType: EntityType;
    providerId: string;
    externalId: string;
    externalDisplayName?: string;
    confidence: number;
    method: ResolutionMethod;
    quarantined: boolean;
  }): Promise<void> {
    await this.repo.upsertAlias({
      ...input,
      verifiedAt: new Date().toISOString(),
      verifiedBy: "system",
    });
    await this.repo.auditLog({
      canonicalId: input.canonicalId,
      entityType: input.entityType,
      action: "ALIAS_ADDED",
      providerId: input.providerId,
      externalId: input.externalId,
    });
  }

  async confirmQuarantine(
    quarantineId: string,
    canonicalId: string,
    resolvedBy: string,
    providerId: string,
    externalId: string,
    entityType: EntityType
  ): Promise<void> {
    await this.repo.resolveQuarantine(quarantineId, "APPROVED", resolvedBy);
    await this.addAlias({
      canonicalId,
      entityType,
      providerId,
      externalId,
      confidence: 1,
      method: "MANUAL",
      quarantined: false,
    });
  }

  async rejectQuarantine(quarantineId: string, resolvedBy: string): Promise<void> {
    await this.repo.resolveQuarantine(quarantineId, "REJECTED", resolvedBy);
  }
}

export { normalizeName, trigramSimilarity } from "./nameMatch.js";
