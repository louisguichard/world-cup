function rankingValue(record) {
    return record.fifaRank ? 10000 - record.fifaRank : record.rating;
}
/** FIFA best-third tiebreakers: pts → GD → GF → fair play → ranking. */
export function compareThirdPlaceTeams(a, b) {
    return (b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        b.conduct - a.conduct ||
        rankingValue(b) - rankingValue(a));
}
export function rankThirdPlaceRecords(records) {
    return [...records].sort(compareThirdPlaceTeams);
}
//# sourceMappingURL=thirdPlaceRanking.js.map