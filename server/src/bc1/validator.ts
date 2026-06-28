/**
 * ZodValidator — wire-boundary schema enforcement.
 * All provider payloads pass through here before touching the RawEventLog.
 * Invalid payloads are quarantined; never silently dropped.
 */

import { prisma } from "../infra/prisma.js";
import { PROVIDER_SCHEMAS } from "./schemas/providerSchemas.js";
import type { ProviderId } from "./schemas/providerSchemas.js";
import type { EntityType } from "../events/types.js";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; violations: string[]; raw: unknown };

export class ZodValidator {
  /**
   * Validates an inbound provider payload.
   * On failure, persists a ProviderSchemaViolation record and returns the error.
   */
  async validate<T>(
    providerId: ProviderId,
    payload: unknown,
    entityType: EntityType = "match"
  ): Promise<ValidationResult<T>> {
    const schema = PROVIDER_SCHEMAS[providerId];
    if (!schema) {
      return {
        ok: false,
        violations: [`No schema registered for provider "${providerId}"`],
        raw: payload,
      };
    }

    const result = schema.safeParse(payload);

    if (!result.success) {
      const violations = result.error ? [result.error] : ["Unknown validation error"];
      await this.recordViolation(providerId, entityType, violations, payload);
      return { ok: false, violations, raw: payload };
    }

    return { ok: true, data: result.data as T };
  }

  /**
   * Validates a raw payload without recording violations — useful for health checks.
   */
  check(providerId: ProviderId, payload: unknown): boolean {
    const schema = PROVIDER_SCHEMAS[providerId];
    if (!schema) return false;
    return schema.safeParse(payload).success;
  }

  private async recordViolation(
    providerId: string,
    entityType: EntityType,
    violations: string[],
    rawPayload: unknown
  ): Promise<void> {
    try {
      // Store the violation in the quarantine table for analyst review
      await prisma.identityQuarantine.create({
        data: {
          externalId: "schema-violation",
          entityType,
          providerId,
          rawPayload: rawPayload as object,
          candidateIds: [],
          topScore: 0,
          reason: `Schema violation: ${violations.join("; ")}`,
        },
      });
    } catch (err) {
      // Never throw from violation recording — log and continue
      console.error("[ZodValidator] Failed to record violation:", err);
    }
  }
}
