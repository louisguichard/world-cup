/**
 * @wc2026/identity — injectable identity resolution service.
 * Database operations are abstracted behind IdentityRepository for testability.
 */
import type { EntityType, IdentityAlias, QuarantineEntry, ResolutionMethod } from "@wc2026/canonical";
export type ResolutionResult = {
    resolved: true;
    canonicalId: string;
    method: ResolutionMethod;
    confidence: number;
} | {
    resolved: false;
    quarantineId: string;
    topScore: number;
    candidates: string[];
};
export interface IdentityRepository {
    findAlias(providerId: string, externalId: string, entityType: EntityType): Promise<IdentityAlias | null>;
    upsertAlias(alias: Omit<IdentityAlias, "id">): Promise<void>;
    createQuarantine(entry: Omit<QuarantineEntry, "id" | "createdAt">): Promise<string>;
    resolveQuarantine(id: string, resolution: "APPROVED" | "REJECTED" | "NEW_ENTITY", resolvedBy: string): Promise<void>;
    auditLog(entry: {
        canonicalId: string;
        entityType: EntityType;
        action: string;
        providerId?: string;
        externalId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
    findCandidatesByName(entityType: EntityType, displayName: string): Promise<Array<{
        canonicalId: string;
        score: number;
    }>>;
}
export declare class IdentityService {
    private readonly repo;
    private readonly FUZZY_THRESHOLD;
    constructor(repo: IdentityRepository);
    resolveToCanonical(providerId: string, externalId: string, entityType: EntityType, displayName?: string): Promise<ResolutionResult>;
    addAlias(input: {
        canonicalId: string;
        entityType: EntityType;
        providerId: string;
        externalId: string;
        externalDisplayName?: string;
        confidence: number;
        method: ResolutionMethod;
        quarantined: boolean;
    }): Promise<void>;
    confirmQuarantine(quarantineId: string, canonicalId: string, resolvedBy: string, providerId: string, externalId: string, entityType: EntityType): Promise<void>;
    rejectQuarantine(quarantineId: string, resolvedBy: string): Promise<void>;
}
export { normalizeName, trigramSimilarity } from "./nameMatch.js";
//# sourceMappingURL=index.d.ts.map