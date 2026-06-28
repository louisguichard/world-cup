/**
 * IdentityService — server facade over @wc2026/identity.
 * All resolution logic lives in packages/identity; this module adds Prisma queue/admin helpers.
 */

import { prisma } from "../infra/prisma.js";
import type { EntityType, IdentityResolved, IdentityQuarantined } from "../events/types.js";
import {
  coreIdentityService,
  PrismaIdentityRepository,
} from "./prismaIdentityRepository.js";
import type { ResolutionResult } from "@wc2026/identity";

export type ResolutionMethod = "EXACT" | "FUZZY" | "MANUAL";

export type { ResolutionResult };

export class IdentityService {
  private readonly core = coreIdentityService;
  private readonly repo = new PrismaIdentityRepository();

  async resolve(
    providerId: string,
    externalId: string,
    entityType: EntityType,
    displayName?: string
  ): Promise<ResolutionResult> {
    return this.core.resolveToCanonical(providerId, externalId, entityType, displayName);
  }

  async registerAlias(
    providerId: string,
    externalId: string,
    entityType: EntityType,
    canonicalId: string,
    method: ResolutionMethod = "MANUAL",
    confidence = 1.0,
    displayName?: string
  ): Promise<void> {
    await this.core.addAlias({
      canonicalId,
      entityType,
      providerId,
      externalId,
      externalDisplayName: displayName,
      confidence,
      method,
      quarantined: false,
    });
  }

  async removeAlias(
    providerId: string,
    externalId: string,
    entityType: EntityType
  ): Promise<void> {
    const alias = await prisma.identityAlias.findUnique({
      where: {
        providerId_externalId_entityType: { providerId, externalId, entityType },
      },
    });
    if (!alias) return;

    await prisma.identityAlias.delete({
      where: {
        providerId_externalId_entityType: { providerId, externalId, entityType },
      },
    });
    await this.repo.auditLog({
      canonicalId: alias.canonicalId,
      entityType: entityType,
      action: "ALIAS_REMOVED",
      providerId,
      externalId,
    });
  }

  async getAliasesForCanonical(canonicalId: string, entityType?: EntityType) {
    return prisma.identityAlias.findMany({
      where: {
        canonicalId,
        ...(entityType ? { entityType } : {}),
        quarantined: false,
      },
    });
  }

  async getQuarantineQueue(page = 0, pageSize = 50) {
    const [items, total] = await Promise.all([
      prisma.identityQuarantine.findMany({
        where: { resolvedAt: null },
        orderBy: { createdAt: "desc" },
        skip: page * pageSize,
        take: pageSize,
      }),
      prisma.identityQuarantine.count({ where: { resolvedAt: null } }),
    ]);
    return { items, total };
  }

  async resolveQuarantine(
    quarantineId: string,
    resolution: "APPROVED" | "REJECTED" | "NEW_ENTITY",
    canonicalId: string | null,
    resolvedBy: string
  ): Promise<void> {
    const item = await prisma.identityQuarantine.findUniqueOrThrow({
      where: { id: quarantineId },
    });

    if (resolution === "APPROVED" && canonicalId) {
      await this.core.confirmQuarantine(
        quarantineId,
        canonicalId,
        resolvedBy,
        item.providerId,
        item.externalId,
        item.entityType as EntityType
      );
      return;
    }

    if (resolution === "REJECTED") {
      await this.core.rejectQuarantine(quarantineId, resolvedBy);
      return;
    }

    await this.repo.resolveQuarantine(quarantineId, resolution, resolvedBy);
  }

  async getQuarantineDepth(): Promise<number> {
    return prisma.identityQuarantine.count({ where: { resolvedAt: null } });
  }

  buildResolvedEvent(
    externalId: string,
    canonicalId: string,
    entityType: EntityType,
    confidence: number,
    method: ResolutionMethod
  ): IdentityResolved {
    return {
      type: "IdentityResolved",
      externalId,
      canonicalId,
      entityType,
      confidence,
      method,
    };
  }

  buildQuarantinedEvent(
    externalId: string,
    entityType: EntityType,
    candidateIds: string[],
    topScore: number,
    reason: string
  ): IdentityQuarantined {
    return {
      type: "IdentityQuarantined",
      externalId,
      entityType,
      candidateIds,
      topScore,
      reason,
    };
  }
}
