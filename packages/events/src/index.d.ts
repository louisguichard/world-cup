import { z } from "zod";
import type { EntityType } from "@wc2026/canonical";
export declare const EntityTypeSchema: z.ZodEnum<["team", "player", "match", "competition", "group", "venue", "city", "country", "weatherLocation", "provider"]>;
export declare const EntityUpdatedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"EntityUpdatedEvent">;
    entityType: z.ZodEnum<["team", "player", "match", "competition", "group", "venue", "city", "country", "weatherLocation", "provider"]>;
    entityId: z.ZodString;
    changedFields: z.ZodArray<z.ZodString, "many">;
    sourceId: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "EntityUpdatedEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    entityId: string;
    changedFields: string[];
    sourceId: string;
    updatedAt: string;
}, {
    type: "EntityUpdatedEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    entityId: string;
    changedFields: string[];
    sourceId: string;
    updatedAt: string;
}>;
export declare const QualificationChangedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"QualificationChangedEvent">;
    teamId: z.ZodString;
    groupId: z.ZodString;
    previousTier: z.ZodNullable<z.ZodEnum<["qualified", "at_risk", "projected_out", "eliminated", "pending"]>>;
    newTier: z.ZodEnum<["qualified", "at_risk", "projected_out", "eliminated", "pending"]>;
    previousCertainty: z.ZodNullable<z.ZodString>;
    newCertainty: z.ZodString;
    decidingMatchId: z.ZodOptional<z.ZodString>;
    changedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "QualificationChangedEvent";
    groupId: string;
    teamId: string;
    previousTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending" | null;
    newTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending";
    previousCertainty: string | null;
    newCertainty: string;
    changedAt: string;
    decidingMatchId?: string | undefined;
}, {
    type: "QualificationChangedEvent";
    groupId: string;
    teamId: string;
    previousTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending" | null;
    newTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending";
    previousCertainty: string | null;
    newCertainty: string;
    changedAt: string;
    decidingMatchId?: string | undefined;
}>;
export declare const PredictionUpdatedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"PredictionUpdatedEvent">;
    matchId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodString>;
    previousP: z.ZodNumber;
    newP: z.ZodNumber;
    delta: z.ZodNumber;
    modelVersion: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PredictionUpdatedEvent";
    updatedAt: string;
    previousP: number;
    newP: number;
    delta: number;
    modelVersion: string;
    matchId?: string | undefined;
    teamId?: string | undefined;
}, {
    type: "PredictionUpdatedEvent";
    updatedAt: string;
    previousP: number;
    newP: number;
    delta: number;
    modelVersion: string;
    matchId?: string | undefined;
    teamId?: string | undefined;
}>;
export declare const CorrectionEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"CorrectionEvent">;
    entityType: z.ZodEnum<["team", "player", "match", "competition", "group", "venue", "city", "country", "weatherLocation", "provider"]>;
    entityId: z.ZodString;
    field: z.ZodString;
    oldValue: z.ZodUnknown;
    newValue: z.ZodUnknown;
    analystId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "CorrectionEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    field: string;
    entityId: string;
    analystId: string;
    reason?: string | undefined;
    newValue?: unknown;
    oldValue?: unknown;
}, {
    type: "CorrectionEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    field: string;
    entityId: string;
    analystId: string;
    reason?: string | undefined;
    newValue?: unknown;
    oldValue?: unknown;
}>;
export declare const IdentityResolvedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"IdentityResolved">;
    externalId: z.ZodString;
    canonicalId: z.ZodString;
    entityType: z.ZodEnum<["team", "player", "match", "competition", "group", "venue", "city", "country", "weatherLocation", "provider"]>;
    confidence: z.ZodNumber;
    method: z.ZodEnum<["EXACT", "FUZZY", "MANUAL"]>;
}, "strip", z.ZodTypeAny, {
    type: "IdentityResolved";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    externalId: string;
    canonicalId: string;
    confidence: number;
    method: "EXACT" | "FUZZY" | "MANUAL";
}, {
    type: "IdentityResolved";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    externalId: string;
    canonicalId: string;
    confidence: number;
    method: "EXACT" | "FUZZY" | "MANUAL";
}>;
export declare const DomainEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"EntityUpdatedEvent">;
    entityType: z.ZodEnum<["team", "player", "match", "competition", "group", "venue", "city", "country", "weatherLocation", "provider"]>;
    entityId: z.ZodString;
    changedFields: z.ZodArray<z.ZodString, "many">;
    sourceId: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "EntityUpdatedEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    entityId: string;
    changedFields: string[];
    sourceId: string;
    updatedAt: string;
}, {
    type: "EntityUpdatedEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    entityId: string;
    changedFields: string[];
    sourceId: string;
    updatedAt: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"QualificationChangedEvent">;
    teamId: z.ZodString;
    groupId: z.ZodString;
    previousTier: z.ZodNullable<z.ZodEnum<["qualified", "at_risk", "projected_out", "eliminated", "pending"]>>;
    newTier: z.ZodEnum<["qualified", "at_risk", "projected_out", "eliminated", "pending"]>;
    previousCertainty: z.ZodNullable<z.ZodString>;
    newCertainty: z.ZodString;
    decidingMatchId: z.ZodOptional<z.ZodString>;
    changedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "QualificationChangedEvent";
    groupId: string;
    teamId: string;
    previousTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending" | null;
    newTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending";
    previousCertainty: string | null;
    newCertainty: string;
    changedAt: string;
    decidingMatchId?: string | undefined;
}, {
    type: "QualificationChangedEvent";
    groupId: string;
    teamId: string;
    previousTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending" | null;
    newTier: "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending";
    previousCertainty: string | null;
    newCertainty: string;
    changedAt: string;
    decidingMatchId?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"PredictionUpdatedEvent">;
    matchId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodString>;
    previousP: z.ZodNumber;
    newP: z.ZodNumber;
    delta: z.ZodNumber;
    modelVersion: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "PredictionUpdatedEvent";
    updatedAt: string;
    previousP: number;
    newP: number;
    delta: number;
    modelVersion: string;
    matchId?: string | undefined;
    teamId?: string | undefined;
}, {
    type: "PredictionUpdatedEvent";
    updatedAt: string;
    previousP: number;
    newP: number;
    delta: number;
    modelVersion: string;
    matchId?: string | undefined;
    teamId?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"CorrectionEvent">;
    entityType: z.ZodEnum<["team", "player", "match", "competition", "group", "venue", "city", "country", "weatherLocation", "provider"]>;
    entityId: z.ZodString;
    field: z.ZodString;
    oldValue: z.ZodUnknown;
    newValue: z.ZodUnknown;
    analystId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "CorrectionEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    field: string;
    entityId: string;
    analystId: string;
    reason?: string | undefined;
    newValue?: unknown;
    oldValue?: unknown;
}, {
    type: "CorrectionEvent";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    field: string;
    entityId: string;
    analystId: string;
    reason?: string | undefined;
    newValue?: unknown;
    oldValue?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"IdentityResolved">;
    externalId: z.ZodString;
    canonicalId: z.ZodString;
    entityType: z.ZodEnum<["team", "player", "match", "competition", "group", "venue", "city", "country", "weatherLocation", "provider"]>;
    confidence: z.ZodNumber;
    method: z.ZodEnum<["EXACT", "FUZZY", "MANUAL"]>;
}, "strip", z.ZodTypeAny, {
    type: "IdentityResolved";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    externalId: string;
    canonicalId: string;
    confidence: number;
    method: "EXACT" | "FUZZY" | "MANUAL";
}, {
    type: "IdentityResolved";
    entityType: "team" | "city" | "venue" | "country" | "match" | "player" | "competition" | "group" | "weatherLocation" | "provider";
    externalId: string;
    canonicalId: string;
    confidence: number;
    method: "EXACT" | "FUZZY" | "MANUAL";
}>]>;
export type DomainEvent = z.infer<typeof DomainEventSchema>;
export type ParseEventResult = {
    ok: true;
    event: DomainEvent;
} | {
    ok: false;
    error: string;
};
export declare function parseEvent(raw: unknown): ParseEventResult;
export type { EntityType };
//# sourceMappingURL=index.d.ts.map