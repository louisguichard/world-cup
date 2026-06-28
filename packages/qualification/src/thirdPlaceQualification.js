import { rankThirdPlaceRecords } from "./thirdPlaceRanking";
const DEFAULT_GROUP_SIZE = 4;
function expectedMatchesPerTeam(groupSize) {
    return Math.max(1, groupSize - 1);
}
function maxPoints(record, expectedPlayed) {
    const remaining = Math.max(0, expectedPlayed - record.played);
    return record.points + remaining * 3;
}
function findTeamGroupInfo(teamId, standings, context) {
    for (const group of standings) {
        const idx = group.rows.findIndex((r) => r.teamId === teamId);
        if (idx < 0)
            continue;
        const rows = group.rows;
        const row = rows[idx];
        const lockedRows = context.lockedStandingsByGroup[group.group];
        const progressRows = lockedRows !== undefined ? lockedRows : rows;
        const progressRow = progressRows.find((r) => r.teamId === teamId) ?? row;
        const groupSize = rows.length || DEFAULT_GROUP_SIZE;
        const expectedPlayed = expectedMatchesPerTeam(groupSize);
        const groupComplete = progressRows.length > 0 && progressRows.every((r) => r.played >= expectedPlayed);
        return {
            group: group.group,
            rank: idx + 1,
            row,
            rows,
            progressRow,
            expectedPlayed,
            remaining: Math.max(0, expectedPlayed - progressRow.played),
            teamMax: maxPoints(progressRow, expectedPlayed),
            groupComplete
        };
    }
    return null;
}
/**
 * True when a team cannot reach any knockout path from their group alone
 * (before the cross-group best-third cut).
 */
export function isGroupMathematicallyEliminated(teamId, standings, context = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }) {
    const info = findTeamGroupInfo(teamId, standings, context);
    if (!info)
        return true;
    const { rank, rows, teamMax, groupComplete, remaining } = info;
    const second = rows[1];
    const third = rows[2];
    if (rank <= 2)
        return false;
    if (rank === 4) {
        if (groupComplete)
            return true;
        if (third && teamMax < third.points)
            return true;
        if (second && teamMax < second.points)
            return true;
        return false;
    }
    if (rank === 3) {
        if (groupComplete)
            return false;
        if (third && teamMax < third.points)
            return true;
        return false;
    }
    const leaderPoints = rows[0]?.points ?? 0;
    const gap = leaderPoints - info.progressRow.points;
    if (gap > remaining * 3)
        return true;
    return false;
}
/** Third-place teams that still have a mathematical path (group-level only). */
export function collectAliveThirdPlaceTeams(standings, context = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }) {
    const thirds = standings.map((s) => s.rows[2]).filter((r) => Boolean(r));
    return thirds.filter((r) => !isGroupMathematicallyEliminated(r.teamId, standings, context));
}
export function rankAliveBestThirds(standings, context = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }) {
    return rankThirdPlaceRecords(collectAliveThirdPlaceTeams(standings, context));
}
export function isKnockoutEliminated(teamId, standings, context = { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} }) {
    const info = findTeamGroupInfo(teamId, standings, context);
    if (!info)
        return true;
    if (info.rank <= 2)
        return false;
    if (isGroupMathematicallyEliminated(teamId, standings, context))
        return true;
    if (info.rank === 3) {
        const aliveRanked = rankAliveBestThirds(standings, context);
        const idx = aliveRanked.findIndex((r) => r.teamId === teamId);
        if (idx < 0)
            return true;
        if (info.groupComplete && idx >= 8)
            return true;
        return false;
    }
    return info.groupComplete;
}
export function thirdPlaceRankAmongAlive(teamId, standings, context) {
    return rankThirdPlaceRecords(standings
        .map((s) => s.rows[2])
        .filter((r) => Boolean(r) && !isGroupMathematicallyEliminated(r.teamId, standings, context))).findIndex((r) => r.teamId === teamId);
}
//# sourceMappingURL=thirdPlaceQualification.js.map