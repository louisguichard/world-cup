/**
 * @wc2026/identity — injectable identity resolution service.
 * Database operations are abstracted behind IdentityRepository for testability.
 */
export class IdentityService {
    repo;
    FUZZY_THRESHOLD = 0.85;
    constructor(repo) {
        this.repo = repo;
    }
    async resolveToCanonical(providerId, externalId, entityType, displayName) {
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
    async addAlias(input) {
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
    async confirmQuarantine(quarantineId, canonicalId, resolvedBy, providerId, externalId, entityType) {
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
    async rejectQuarantine(quarantineId, resolvedBy) {
        await this.repo.resolveQuarantine(quarantineId, "REJECTED", resolvedBy);
    }
}
export { normalizeName, trigramSimilarity } from "./nameMatch.js";
//# sourceMappingURL=index.js.map