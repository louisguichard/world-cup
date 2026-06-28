/**
 * Prisma-backed IdentityRepository — sole persistence adapter for @wc2026/identity.
 */

import type {
  EntityType,
  IdentityAlias,
  QuarantineEntry,
  ResolutionMethod,
} from "@wc2026/canonical";
import {
  IdentityService as CoreIdentityService,
  normalizeName,
  trigramSimilarity,
  type IdentityRepository,
} from "@wc2026/identity";
import { prisma } from "../infra/prisma.js";

function toAlias(row: {
  id: string;
  canonicalId: string;
  entityType: string;
  providerId: string;
  externalId: string;
  externalDisplayName: string | null;
  confidence: number;
  method: string;
  quarantined: boolean;
  quarantineReason: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
}): IdentityAlias {
  return {
    id: row.id,
    canonicalId: row.canonicalId,
    entityType: row.entityType as EntityType,
    providerId: row.providerId,
    externalId: row.externalId,
    externalDisplayName: row.externalDisplayName ?? undefined,
    confidence: row.confidence,
    method: row.method as ResolutionMethod,
    quarantined: row.quarantined,
    quarantineReason: row.quarantineReason ?? undefined,
    verifiedAt: row.verifiedAt?.toISOString(),
    verifiedBy: row.verifiedBy ?? undefined,
  };
}

export class PrismaIdentityRepository implements IdentityRepository {
  async findAlias(
    providerId: string,
    externalId: string,
    entityType: EntityType
  ): Promise<IdentityAlias | null> {
    const row = await prisma.identityAlias.findUnique({
      where: {
        providerId_externalId_entityType: { providerId, externalId, entityType },
      },
    });
    return row ? toAlias(row) : null;
  }

  async upsertAlias(alias: Omit<IdentityAlias, "id">): Promise<void> {
    await prisma.identityAlias.upsert({
      where: {
        providerId_externalId_entityType: {
          providerId: alias.providerId,
          externalId: alias.externalId,
          entityType: alias.entityType,
        },
      },
      update: {
        canonicalId: alias.canonicalId,
        method: alias.method,
        confidence: alias.confidence,
        externalDisplayName: alias.externalDisplayName,
        quarantined: alias.quarantined,
        quarantineReason: alias.quarantineReason ?? null,
        verifiedAt: alias.verifiedAt ? new Date(alias.verifiedAt) : new Date(),
        verifiedBy: alias.verifiedBy ?? "system",
      },
      create: {
        canonicalId: alias.canonicalId,
        entityType: alias.entityType,
        providerId: alias.providerId,
        externalId: alias.externalId,
        externalDisplayName: alias.externalDisplayName,
        confidence: alias.confidence,
        method: alias.method,
        quarantined: alias.quarantined,
        quarantineReason: alias.quarantineReason,
        verifiedAt: alias.verifiedAt ? new Date(alias.verifiedAt) : new Date(),
        verifiedBy: alias.verifiedBy ?? "system",
      },
    });
  }

  async createQuarantine(
    entry: Omit<QuarantineEntry, "id" | "createdAt">
  ): Promise<string> {
    const record = await prisma.identityQuarantine.create({
      data: {
        externalId: entry.externalId,
        entityType: entry.entityType,
        providerId: entry.providerId,
        rawPayload: entry.rawPayload as object,
        candidateIds: entry.candidateIds,
        topScore: entry.topScore,
        reason: entry.reason,
      },
    });
    await this.auditLog({
      canonicalId: "unresolved",
      entityType: entry.entityType,
      action: "QUARANTINED",
      providerId: entry.providerId,
      externalId: entry.externalId,
      metadata: { reason: entry.reason, topScore: entry.topScore },
    });
    return record.id;
  }

  async resolveQuarantine(
    id: string,
    resolution: "APPROVED" | "REJECTED" | "NEW_ENTITY",
    resolvedBy: string
  ): Promise<void> {
    await prisma.identityQuarantine.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });
  }

  async auditLog(entry: {
    canonicalId: string;
    entityType: EntityType;
    action: string;
    providerId?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await prisma.identityAuditLog.create({
      data: {
        canonicalId: entry.canonicalId,
        entityType: entry.entityType,
        action: entry.action,
        providerId: entry.providerId,
        externalId: entry.externalId,
        metadata: entry.metadata ?? {},
      },
    });
  }

  async findCandidatesByName(
    entityType: EntityType,
    displayName: string
  ): Promise<Array<{ canonicalId: string; score: number }>> {
    const normalized = normalizeName(displayName);
    if (entityType === "team") {
      const teams = await prisma.canonicalTeam.findMany({
        select: { id: true, displayName: true },
      });
      return teams
        .map((t) => ({
          canonicalId: t.id,
          score: trigramSimilarity(normalized, normalizeName(t.displayName)),
        }))
        .sort((a, b) => b.score - a.score);
    }
    if (entityType === "player") {
      const players = await prisma.canonicalPlayer.findMany({
        select: { id: true, displayName: true },
      });
      return players
        .map((p) => ({
          canonicalId: p.id,
          score: trigramSimilarity(normalized, normalizeName(p.displayName)),
        }))
        .sort((a, b) => b.score - a.score);
    }
    return [];
  }
}

/** Singleton core resolver — import this from server code instead of duplicating logic. */
export const coreIdentityService = new CoreIdentityService(new PrismaIdentityRepository());
