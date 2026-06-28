import type { GroupLetter, GroupStanding, TeamRecord } from "./engineTypes.js";
export type QualificationMatchContext = {
    lockedGroupMatchCount: Partial<Record<GroupLetter, number>>;
    lockedStandingsByGroup: Partial<Record<GroupLetter, TeamRecord[]>>;
};
/**
 * True when a team cannot reach any knockout path from their group alone
 * (before the cross-group best-third cut).
 */
export declare function isGroupMathematicallyEliminated(teamId: string, standings: GroupStanding[], context?: QualificationMatchContext): boolean;
/** Third-place teams that still have a mathematical path (group-level only). */
export declare function collectAliveThirdPlaceTeams(standings: GroupStanding[], context?: QualificationMatchContext): TeamRecord[];
export declare function rankAliveBestThirds(standings: GroupStanding[], context?: QualificationMatchContext): TeamRecord[];
export declare function isKnockoutEliminated(teamId: string, standings: GroupStanding[], context?: QualificationMatchContext): boolean;
export declare function thirdPlaceRankAmongAlive(teamId: string, standings: GroupStanding[], context: QualificationMatchContext): number;
//# sourceMappingURL=thirdPlaceQualification.d.ts.map