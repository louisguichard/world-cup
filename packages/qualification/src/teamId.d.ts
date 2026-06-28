import type { Team } from "./engineTypes.js";
/** Normalize team id for standings keys — alias expansion lives in BC1. */
export declare function resolveCanonicalTeamId(teamId: string, team?: Pick<Team, "abbreviation" | "name" | "shortName">): string;
//# sourceMappingURL=teamId.d.ts.map