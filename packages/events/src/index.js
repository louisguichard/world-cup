import { z } from "zod";
const qualificationEngineStatusSchema = z.enum([
    "qualified",
    "at_risk",
    "projected_out",
    "eliminated",
    "pending",
]);
export const EntityTypeSchema = z.enum([
    "team",
    "player",
    "match",
    "competition",
    "group",
    "venue",
    "city",
    "country",
    "weatherLocation",
    "provider",
]);
export const EntityUpdatedEventSchema = z.object({
    type: z.literal("EntityUpdatedEvent"),
    entityType: EntityTypeSchema,
    entityId: z.string(),
    changedFields: z.array(z.string()),
    sourceId: z.string(),
    updatedAt: z.string(),
});
export const QualificationChangedEventSchema = z.object({
    type: z.literal("QualificationChangedEvent"),
    teamId: z.string(),
    groupId: z.string(),
    previousTier: qualificationEngineStatusSchema.nullable(),
    newTier: qualificationEngineStatusSchema,
    previousCertainty: z.string().nullable(),
    newCertainty: z.string(),
    decidingMatchId: z.string().optional(),
    changedAt: z.string(),
});
export const PredictionUpdatedEventSchema = z.object({
    type: z.literal("PredictionUpdatedEvent"),
    matchId: z.string().optional(),
    teamId: z.string().optional(),
    previousP: z.number(),
    newP: z.number(),
    delta: z.number(),
    modelVersion: z.string(),
    updatedAt: z.string(),
});
export const CorrectionEventSchema = z.object({
    type: z.literal("CorrectionEvent"),
    entityType: EntityTypeSchema,
    entityId: z.string(),
    field: z.string(),
    oldValue: z.unknown(),
    newValue: z.unknown(),
    analystId: z.string(),
    reason: z.string().optional(),
});
export const IdentityResolvedEventSchema = z.object({
    type: z.literal("IdentityResolved"),
    externalId: z.string(),
    canonicalId: z.string(),
    entityType: EntityTypeSchema,
    confidence: z.number(),
    method: z.enum(["EXACT", "FUZZY", "MANUAL"]),
});
export const DomainEventSchema = z.discriminatedUnion("type", [
    EntityUpdatedEventSchema,
    QualificationChangedEventSchema,
    PredictionUpdatedEventSchema,
    CorrectionEventSchema,
    IdentityResolvedEventSchema,
]);
export function parseEvent(raw) {
    const result = DomainEventSchema.safeParse(raw);
    if (result.success)
        return { ok: true, event: result.data };
    return {
        ok: false,
        error: result.error.issues.map((i) => i.message).join("; "),
    };
}
//# sourceMappingURL=index.js.map