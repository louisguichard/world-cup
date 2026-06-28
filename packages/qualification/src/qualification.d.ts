import type { GroupLetter, GroupStanding, Match, MatchWithScore, QualificationStatus, QualificationTier, ScoreOverride, Team, TeamRecord } from "./engineTypes.js";
export declare function expectedMatchesPerTeam(groupSize: number): number;
export declare function matchesInGroup(groupSize: number): number;
export type QualificationMatchContext = {
    lockedGroupMatchCount: Partial<Record<GroupLetter, number>>;
    lockedStandingsByGroup: Partial<Record<GroupLetter, TeamRecord[]>>;
};
export declare function buildQualificationContext(matches: Match[], teams?: Team[]): QualificationMatchContext;
export type ConfirmedTopTwoOptions = {
    lockedGroupMatchCount?: number;
    groupSize?: number;
    lockedRows?: TeamRecord[];
};
export declare function deriveStandings(matches: MatchWithScore[], teams: Team[], _overrides?: Record<string, ScoreOverride>): GroupStanding[];
export type DeriveStandingsOptions = {
    lockedOnly?: boolean;
};
/** Whether a match should affect group standings (store + replay). */
export declare function matchCountsForStandings(match: Match, opts?: DeriveStandingsOptions): match is MatchWithScore;
export declare function deriveStandingsIfScored(matches: Match[], teams: Team[], opts?: DeriveStandingsOptions): GroupStanding[] | null;
export declare function maxPoints(record: TeamRecord, expectedPlayed?: number): number;
/**
 * A team is CONFIRMED top-two only when:
 * 1. They have played all group stage matches
 * 2. Every other team in their group has also played all matches
 *    (group stage fully complete — no results can change the table)
 * 3. Their final rank in the sorted standings is 1st or 2nd
 *
 * If any team in the group has remaining matches, no team
 * in that group can be confirmed — only projected.
 */
export declare function isConfirmedTopTwo(row: TeamRecord, rows: TeamRecord[], opts?: ConfirmedTopTwoOptions): boolean;
/** @deprecated Rule-based confidence replaced sigmoid; returns 0–1 for legacy callers only. */
export declare function computeEliminationProbability(pointsGap: number, matchesRemaining: number): number;
export declare function computeQualificationStatus(teamId: string, standings: GroupStanding[], context?: QualificationMatchContext): QualificationStatus;
export { rankAliveBestThirds } from "./thirdPlaceQualification";
export type ProjectionViolation = {
    teamId: string;
    issue: string;
    status: QualificationStatus;
};
/** Audit helper: eliminated teams must never show as projected-through. */
export declare function auditProjectionViolations(teamIds: string[], standings: GroupStanding[], context?: QualificationMatchContext): ProjectionViolation[];
export type QualificationBuckets = {
    confirmedThrough: string[];
    projectedStrongThrough: string[];
    projectedWeakThrough: string[];
    projectedThrough: string[];
    confirmedOut: string[];
    projectedOut: string[];
    inContention: string[];
};
export declare function bucketQualificationTeams(teamIds: string[], standings: GroupStanding[], context?: QualificationMatchContext): QualificationBuckets;
export declare function assertBucketMutualExclusion(buckets: QualificationBuckets): void;
export declare function useQualificationTierFromStatus(status: QualificationStatus): QualificationTier;
export declare function auditFalseConfirmations(standings: GroupStanding[], context: QualificationMatchContext): Array<{
    teamId: string;
    group: GroupLetter;
    displayPlayed: number;
    lockedPlayed: number;
    lockedMatchCount: number | undefined;
}>;
export declare function groupStageComplete(matches: Array<{
    group?: string;
    status: string;
}>): boolean;
export declare function standingsEqual(a: GroupStanding[], b: GroupStanding[]): boolean;
//# sourceMappingURL=qualification.d.ts.map