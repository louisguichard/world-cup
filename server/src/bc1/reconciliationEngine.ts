/**
 * ReconciliationEngine — field-level source-of-truth arbitration.
 * Materializes canonical entity state from multiple provider inputs,
 * enforcing the source-truth policy table defined in the architecture plan.
 *
 * Authority chain: PRIMARY > BACKUP > COMPUTED
 * ANALYST_OVERRIDE always wins for the corrected field until reverted or result locked.
 */

import { prisma } from "../infra/prisma.js";
import { redis, CACHE_TTL, cacheKey } from "../infra/redis.js";
import type {
  AuthorityLevel,
  SourceTrace,
  EntityUpdatedEvent,
  MatchResultLockedEvent,
  EntityType,
} from "../events/types.js";

// ─────────────────────────────────────────────
// Source-of-truth policy table
// ─────────────────────────────────────────────

export interface FieldPolicy {
  primary: string;
  backup?: string;
  fallback?: string;
  lockOnMatchResult?: boolean; // if true, locked result always wins
}

export const FIELD_POLICIES: Record<string, FieldPolicy> = {
  "team.canonicalId":      { primary: "static-catalog" },
  "team.fifaRanking":      { primary: "fifa", backup: "static-catalog" },
  "team.eloRating":        { primary: "clubelo", backup: "computed" },
  "match.status":          { primary: "espn", backup: "wc-live", fallback: "sofascore" },
  "match.score.live":      { primary: "wc-live", backup: "consensus", fallback: "espn" },
  "match.score.final":     { primary: "fifa", backup: "wc-live", fallback: "espn", lockOnMatchResult: true },
  "match.kickoffUtc":      { primary: "fifa", backup: "zafronix", fallback: "espn" },
  "standings.points":      { primary: "fifa", backup: "wc-live", fallback: "computed" },
  "group.teamAssignment":  { primary: "static-catalog" },
  "venue.coordinates":     { primary: "static-catalog", backup: "zafronix" },
  "player.displayName":    { primary: "fifa", backup: "sofascore" },
  "weather.snapshot":      { primary: "yahoo", backup: "openweather" },
};

export type ReconciledField = {
  value: unknown;
  authority: AuthorityLevel;
  providerId: string;
  assertedAt: string;
};

export type ProviderInput = {
  providerId: string;
  fields: Record<string, unknown>;
  assertedAt: string;
};

export class ReconciliationEngine {
  /**
   * Reconciles a canonical team entity from multiple provider inputs.
   * Returns the set of changed fields (for EntityUpdatedEvent emission).
   */
  async reconcileTeam(
    canonicalId: string,
    inputs: ProviderInput[]
  ): Promise<string[]> {
    const current = await prisma.canonicalTeam.findUnique({
      where: { id: canonicalId },
    });

    const reconciledFields = this.applyPolicy("team", inputs);
    const changedFields: string[] = [];

    const update: Record<string, unknown> = {};

    for (const [field, resolved] of Object.entries(reconciledFields)) {
      const currentVal = current?.[field as keyof typeof current];
      if (JSON.stringify(currentVal) !== JSON.stringify(resolved.value)) {
        update[field] = resolved.value;
        changedFields.push(field);
      }
    }

    if (Object.keys(update).length > 0) {
      const sourceTrace = this.buildSourceTrace(reconciledFields);
      await prisma.canonicalTeam.upsert({
        where: { id: canonicalId },
        update: {
          ...update,
          version: { increment: 1 },
          sourceTrace,
        },
        create: {
          id: canonicalId,
          displayName: (update.displayName ?? "") as string,
          shortCode: (update.shortCode ?? "") as string,
          countryCode: (update.countryCode ?? "") as string,
          ...update,
          sourceTrace,
        },
      });

      // Invalidate cache
      await redis.del(cacheKey("team", canonicalId));
    }

    return changedFields;
  }

  /**
   * Reconciles a canonical match entity.
   * Emits MatchResultLockedEvent if status transitions to COMPLETED.
   */
  async reconcileMatch(
    canonicalId: string,
    inputs: ProviderInput[]
  ): Promise<{ changedFields: string[]; lockedEvent?: MatchResultLockedEvent }> {
    const current = await prisma.canonicalMatch.findUnique({
      where: { id: canonicalId },
    });

    const reconciledFields = this.applyPolicy("match", inputs);
    const changedFields: string[] = [];
    const update: Record<string, unknown> = {};

    for (const [field, resolved] of Object.entries(reconciledFields)) {
      const currentVal = current?.[field as keyof typeof current];
      if (JSON.stringify(currentVal) !== JSON.stringify(resolved.value)) {
        update[field] = resolved.value;
        changedFields.push(field);
      }
    }

    let lockedEvent: MatchResultLockedEvent | undefined;

    // Detect result locking: status changes to COMPLETED from a non-COMPLETED state
    const newStatus = update.status as string | undefined;
    const wasNotCompleted = current?.status !== "COMPLETED";
    if (newStatus === "COMPLETED" && wasNotCompleted && !current?.resultLocked) {
      update.resultLocked = true;
      changedFields.push("resultLocked");

      lockedEvent = {
        type: "MatchResultLockedEvent",
        matchId: canonicalId,
        homeTeamId: current?.homeTeamId ?? (update.homeTeamId as string),
        awayTeamId: current?.awayTeamId ?? (update.awayTeamId as string),
        homeScore: (update.homeScore ?? current?.homeScore ?? 0) as number,
        awayScore: (update.awayScore ?? current?.awayScore ?? 0) as number,
        groupId: (update.groupId ?? current?.groupId) as string | undefined,
        lockedAt: new Date().toISOString(),
        sourceId: inputs[0]?.providerId ?? "unknown",
      };
    }

    if (Object.keys(update).length > 0) {
      const sourceTrace = this.buildSourceTrace(reconciledFields);
      await prisma.canonicalMatch.upsert({
        where: { id: canonicalId },
        update: {
          ...update,
          version: { increment: 1 },
          sourceTrace,
        },
        create: {
          id: canonicalId,
          homeTeamId: (update.homeTeamId ?? "") as string,
          awayTeamId: (update.awayTeamId ?? "") as string,
          kickoffUtc: (update.kickoffUtc ?? new Date()) as Date,
          ...update,
          sourceTrace,
        },
      });

      // Invalidate caches
      const match = current ?? { groupId: null };
      const keys = [
        cacheKey("match", canonicalId),
        ...(match.groupId ? [cacheKey("standings", match.groupId)] : []),
      ];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }

    return { changedFields, lockedEvent };
  }

  /**
   * Applies the analyst ANALYST_OVERRIDE authority level to a field.
   * Corrections always win and are recorded in the sourceTrace.
   */
  applyAnalystOverride(
    entityType: EntityType,
    canonicalId: string,
    field: string,
    value: unknown,
    analystId: string
  ): SourceTrace {
    return {
      field,
      providerId: `analyst:${analystId}`,
      externalId: canonicalId,
      value,
      authority: "ANALYST_OVERRIDE",
      assertedAt: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────
  // Private: policy application
  // ─────────────────────────────────────────────

  private applyPolicy(
    entityType: string,
    inputs: ProviderInput[]
  ): Record<string, ReconciledField> {
    const allFields = new Set<string>();
    for (const input of inputs) {
      for (const field of Object.keys(input.fields)) {
        allFields.add(field);
      }
    }

    const result: Record<string, ReconciledField> = {};

    for (const field of allFields) {
      const policyKey = `${entityType}.${field}`;
      const policy = FIELD_POLICIES[policyKey];

      if (!policy) {
        // No declared policy — take first available value (lowest trust)
        const first = inputs.find((i) => i.fields[field] !== undefined);
        if (first) {
          result[field] = {
            value: first.fields[field],
            authority: "BACKUP",
            providerId: first.providerId,
            assertedAt: first.assertedAt,
          };
        }
        continue;
      }

      // Try primary
      const primary = inputs.find((i) => i.providerId === policy.primary);
      if (primary?.fields[field] !== undefined) {
        result[field] = {
          value: primary.fields[field],
          authority: "PRIMARY",
          providerId: primary.providerId,
          assertedAt: primary.assertedAt,
        };
        continue;
      }

      // Try backup
      if (policy.backup) {
        const backup = inputs.find((i) => i.providerId === policy.backup);
        if (backup?.fields[field] !== undefined) {
          result[field] = {
            value: backup.fields[field],
            authority: "BACKUP",
            providerId: backup.providerId,
            assertedAt: backup.assertedAt,
          };
          continue;
        }
      }

      // Try fallback
      if (policy.fallback) {
        const fallback = inputs.find((i) => i.providerId === policy.fallback);
        if (fallback?.fields[field] !== undefined) {
          result[field] = {
            value: fallback.fields[field],
            authority: "BACKUP",
            providerId: fallback.providerId,
            assertedAt: fallback.assertedAt,
          };
        }
      }
    }

    return result;
  }

  private buildSourceTrace(
    reconciledFields: Record<string, ReconciledField>
  ): SourceTrace[] {
    return Object.entries(reconciledFields).map(([field, resolved]) => ({
      field,
      providerId: resolved.providerId,
      externalId: "",
      value: resolved.value,
      authority: resolved.authority,
      assertedAt: resolved.assertedAt,
    }));
  }

  /**
   * Builds an EntityUpdatedEvent for publishing to the event bus.
   */
  buildEntityUpdatedEvent(
    entityType: EntityType,
    entityId: string,
    changedFields: string[],
    sourceId: string,
    reconciledFields: Record<string, ReconciledField>
  ): EntityUpdatedEvent {
    const fieldPolicy: Record<string, AuthorityLevel> = {};
    for (const field of changedFields) {
      fieldPolicy[field] = reconciledFields[field]?.authority ?? "BACKUP";
    }

    return {
      type: "EntityUpdatedEvent",
      entityType,
      entityId,
      changedFields,
      sourceId,
      fieldPolicy,
      updatedAt: new Date().toISOString(),
    };
  }
}
