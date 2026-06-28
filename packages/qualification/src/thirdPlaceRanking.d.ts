import type { TeamRecord } from "./engineTypes.js";
/** FIFA best-third tiebreakers: pts → GD → GF → fair play → ranking. */
export declare function compareThirdPlaceTeams(a: TeamRecord, b: TeamRecord): number;
export declare function rankThirdPlaceRecords(records: TeamRecord[]): TeamRecord[];
//# sourceMappingURL=thirdPlaceRanking.d.ts.map