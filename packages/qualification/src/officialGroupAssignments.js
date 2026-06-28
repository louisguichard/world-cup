import { groupLetters } from "./engineTypes.js";
/** Official FIFA World Cup 2026 draw — canonical catalog ids per group. */
export const OFFICIAL_GROUP_ASSIGNMENTS = {
    A: ["mex", "rsa", "kor", "cze"],
    B: ["can", "bih", "qat", "sui"],
    C: ["bra", "mar", "hai", "sco"],
    D: ["usa", "par", "aus", "tur"],
    E: ["ger", "cuw", "civ", "ecu"],
    F: ["ned", "jpn", "swe", "tun"],
    G: ["bel", "egy", "irn", "nzl"],
    H: ["esp", "cpv", "ksa", "uru"],
    I: ["fra", "sen", "irq", "nor"],
    J: ["arg", "alg", "aut", "jor"],
    K: ["por", "cod", "uzb", "col"],
    L: ["eng", "cro", "gha", "pan"],
};
export function buildOfficialGroupRosterFromAssignments() {
    return Object.fromEntries(groupLetters.map((group) => [group, [...OFFICIAL_GROUP_ASSIGNMENTS[group]]]));
}
//# sourceMappingURL=officialGroupAssignments.js.map