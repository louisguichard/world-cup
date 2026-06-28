/**
 * CorrectionPipeline — event-sourced analyst overrides with full audit trail.
 *
 * Rules:
 * - All corrections are append-only events; never destructive writes.
 * - ANALYST_OVERRIDE authority wins over provider data for the corrected field.
 * - A MatchResultLockedEvent always supersedes analyst corrections on score fields
 *   (configurable per field via lockOnMatchResult in FIELD_POLICIES).
 * - Corrections can be reverted; the revert is itself a new correction event.
 */

import { prisma } from "../infra/prisma.js";
import { redis } from "../infra/redis.js";
import { STREAM_KEYS } from "../events/types.js";
import type { CorrectionEventMsg, EntityType } from "../events/types.js";

export interface SubmitCorrectionInput {
  entityType: EntityType;
  entityId: string;
  field: string;
  newValue: unknown;
  analystId: string;
  reason?: string;
}

export interface CorrectionHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  analystId: string;
  reason?: string;
  appliedAt: Date;
  revertedAt?: Date;
  revertedBy?: string;
}

export class CorrectionPipeline {
  /**
   * Submits a new field-level correction event.
   * Reads the current canonical value as the "oldValue" for the audit trail.
   * Publishes the correction to the event bus for downstream recompute.
   */
  async submit(input: SubmitCorrectionInput): Promise<string> {
    const oldValue = await this.readCurrentValue(
      input.entityType,
      input.entityId,
      input.field
    );

    const record = await prisma.correctionEvent.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        oldValue: oldValue !== undefined ? (oldValue as object) : undefined,
        newValue: input.newValue as object,
        analystId: input.analystId,
        reason: input.reason,
      },
    });

    // Apply the correction to the canonical store
    await this.applyCorrection(input);

    // Publish to event bus so downstream workers (qualification, prediction) recompute
    const event: CorrectionEventMsg = {
      type: "CorrectionEvent",
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      oldValue,
      newValue: input.newValue,
      analystId: input.analystId,
      reason: input.reason,
    };

    await redis.xadd(
      STREAM_KEYS.intake,
      "*",
      "type", event.type,
      "entityType", event.entityType,
      "entityId", event.entityId,
      "field", event.field,
      "analystId", event.analystId,
      "payload", JSON.stringify(event)
    );

    return record.id;
  }

  /**
   * Reverts a correction. The revert is recorded as a new correction event
   * that restores the previous value, maintaining full audit trail.
   */
  async revert(correctionId: string, revertedBy: string): Promise<void> {
    const correction = await prisma.correctionEvent.findUniqueOrThrow({
      where: { id: correctionId },
    });

    if (correction.revertedAt) {
      throw new Error(`Correction ${correctionId} has already been reverted`);
    }

    await prisma.correctionEvent.update({
      where: { id: correctionId },
      data: { revertedAt: new Date(), revertedBy },
    });

    // Submit a new correction to restore the original value
    if (correction.oldValue !== null) {
      await this.submit({
        entityType: correction.entityType as EntityType,
        entityId: correction.entityId,
        field: correction.field,
        newValue: correction.oldValue,
        analystId: revertedBy,
        reason: `Revert of correction ${correctionId}`,
      });
    }
  }

  /**
   * Returns the full audit trail for an entity.
   */
  async getHistory(
    entityType: EntityType,
    entityId: string
  ): Promise<CorrectionHistoryEntry[]> {
    const records = await prisma.correctionEvent.findMany({
      where: { entityType, entityId },
      orderBy: { appliedAt: "asc" },
    });

    return records.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      field: r.field,
      oldValue: r.oldValue,
      newValue: r.newValue,
      analystId: r.analystId,
      reason: r.reason ?? undefined,
      appliedAt: r.appliedAt,
      revertedAt: r.revertedAt ?? undefined,
      revertedBy: r.revertedBy ?? undefined,
    }));
  }

  /**
   * Returns all active (non-reverted) corrections for a given entity.
   * Used by ReconciliationEngine to apply analyst overrides on top of provider state.
   */
  async getActiveCorrections(
    entityType: EntityType,
    entityId: string
  ): Promise<Record<string, unknown>> {
    const records = await prisma.correctionEvent.findMany({
      where: { entityType, entityId, revertedAt: null },
      orderBy: { appliedAt: "asc" }, // later corrections override earlier ones
    });

    const active: Record<string, unknown> = {};
    for (const r of records) {
      active[r.field] = r.newValue;
    }
    return active;
  }

  /**
   * Replay all corrections for an entity in order.
   * Useful for full system replay from raw event log.
   */
  async replayForEntity(
    entityType: EntityType,
    entityId: string,
    upTo?: Date
  ): Promise<Record<string, unknown>> {
    const records = await prisma.correctionEvent.findMany({
      where: {
        entityType,
        entityId,
        revertedAt: null,
        ...(upTo ? { appliedAt: { lte: upTo } } : {}),
      },
      orderBy: { appliedAt: "asc" },
    });

    const state: Record<string, unknown> = {};
    for (const r of records) {
      state[r.field] = r.newValue;
    }
    return state;
  }

  // ─────────────────────────────────────────────
  // Private: apply correction to canonical store
  // ─────────────────────────────────────────────

  private async applyCorrection(input: SubmitCorrectionInput): Promise<void> {
    const { entityType, entityId, field, newValue } = input;

    if (entityType === "team") {
      await prisma.canonicalTeam.updateMany({
        where: { id: entityId },
        data: { [field]: newValue as string, version: { increment: 1 } },
      });
      return;
    }

    if (entityType === "match") {
      await prisma.canonicalMatch.updateMany({
        where: { id: entityId },
        data: { [field]: newValue as string, version: { increment: 1 } },
      });
      return;
    }

    if (entityType === "player") {
      await prisma.canonicalPlayer.updateMany({
        where: { id: entityId },
        data: { [field]: newValue as string, version: { increment: 1 } },
      });
      return;
    }

    // For other entity types, corrections are recorded in the log only
    // until their canonical store tables are added
  }

  private async readCurrentValue(
    entityType: EntityType,
    entityId: string,
    field: string
  ): Promise<unknown> {
    if (entityType === "team") {
      const team = await prisma.canonicalTeam.findUnique({ where: { id: entityId } });
      return team?.[field as keyof typeof team];
    }

    if (entityType === "match") {
      const match = await prisma.canonicalMatch.findUnique({ where: { id: entityId } });
      return match?.[field as keyof typeof match];
    }

    if (entityType === "player") {
      const player = await prisma.canonicalPlayer.findUnique({ where: { id: entityId } });
      return player?.[field as keyof typeof player];
    }

    return undefined;
  }
}
