/**
 * @wc2026/qualification — BC2 pure deterministic qualification engine.
 */
export { buildQualificationContext, computeQualificationStatus, deriveStandings, deriveStandingsIfScored, expectedMatchesPerTeam, matchesInGroup, standingsEqual, matchCountsForStandings, maxPoints, isConfirmedTopTwo, computeEliminationProbability, auditProjectionViolations, bucketQualificationTeams, assertBucketMutualExclusion, useQualificationTierFromStatus, auditFalseConfirmations, groupStageComplete, } from "./qualification.js";
export { rankAliveBestThirds, thirdPlaceRankAmongAlive, isKnockoutEliminated } from "./thirdPlaceQualification.js";
export { rankThirdPlaceRecords, compareThirdPlaceTeams } from "./thirdPlaceRanking.js";
export { computeStandings, rankBestThirds } from "./standings.js";
export { groupLetters } from "./engineTypes.js";
export { OFFICIAL_GROUP_ASSIGNMENTS } from "./officialGroupAssignments.js";
export { QUALIFICATION_ENGINE_VERSION } from "./engineVersion.js";
//# sourceMappingURL=index.js.map