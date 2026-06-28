/** BC2 engine input/output types — no UI dependencies. */
export declare const groupLetters: readonly ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
export type GroupLetter = (typeof groupLetters)[number];
export type MatchStatus = "completed" | "live" | "scheduled" | "postponed" | "interrupted" | "cancelled";
export type SourceKind = "espn" | "sofascore" | "polymarket" | "model" | "manual";
export type Team = {
    id: string;
    name: string;
    shortName: string;
    abbreviation: string;
    group: GroupLetter;
    rating: number;
    fifaRank?: number;
};
export type Match = {
    id: string;
    group?: GroupLetter;
    date: string;
    homeTeamId: string;
    awayTeamId: string;
    status: MatchStatus;
    homeScore?: number;
    awayScore?: number;
    homeConduct: number;
    awayConduct: number;
    locked: boolean;
    source: SourceKind;
};
export type ScoreOverride = {
    homeScore: number;
    awayScore: number;
};
export type MatchWithScore = Match & {
    homeScore: number;
    awayScore: number;
};
export type TeamRecord = {
    teamId: string;
    group: GroupLetter;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    conduct: number;
    rating: number;
    fifaRank?: number;
};
export type GroupStanding = {
    group: GroupLetter;
    rows: TeamRecord[];
};
export type QualificationTier = "qualified" | "at_risk" | "projected_out" | "eliminated" | "pending";
export type QualificationCertainty = "confirmed" | "projected_strong" | "projected_weak" | "projected";
export type LifeState = "alive" | "projected" | "eliminated";
export type QualificationStatus = {
    status: QualificationTier;
    certainty: QualificationCertainty;
    lifeState: LifeState;
    canQualify: boolean;
    projectionScore: number;
    pointsNeeded?: number;
    reason?: string;
    eliminationReason?: string;
    eliminationProbability?: number;
};
//# sourceMappingURL=engineTypes.d.ts.map