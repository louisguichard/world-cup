import { OFFICIAL_GROUP_ASSIGNMENTS } from "./officialGroupAssignments.js";
import { groupLetters, } from "./engineTypes.js";
import { resolveCanonicalTeamId } from "./teamId.js";
import { rankThirdPlaceRecords } from "./thirdPlaceRanking.js";
function goalDifference(record) {
    return record.goalsFor - record.goalsAgainst;
}
function matchResultPoints(goalsFor, goalsAgainst) {
    if (goalsFor > goalsAgainst)
        return 3;
    if (goalsFor === goalsAgainst)
        return 1;
    return 0;
}
function rankingValue(record) {
    return record.fifaRank ? 10000 - record.fifaRank : record.rating;
}
function groupByValue(records, valueFor) {
    const buckets = new Map();
    for (const record of records) {
        const value = valueFor(record);
        const bucket = buckets.get(value) ?? [];
        bucket.push(record);
        buckets.set(value, bucket);
    }
    return [...buckets.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, bucket]) => bucket);
}
function headToHeadStats(records, matches) {
    const ids = new Set(records.map((record) => record.teamId));
    const stats = Object.fromEntries(records.map((record) => [record.teamId, { points: 0, goalsFor: 0, goalsAgainst: 0 }]));
    for (const match of matches) {
        if (!ids.has(match.homeTeamId) || !ids.has(match.awayTeamId))
            continue;
        stats[match.homeTeamId].points += matchResultPoints(match.homeScore, match.awayScore);
        stats[match.homeTeamId].goalsFor += match.homeScore;
        stats[match.homeTeamId].goalsAgainst += match.awayScore;
        stats[match.awayTeamId].points += matchResultPoints(match.awayScore, match.homeScore);
        stats[match.awayTeamId].goalsFor += match.awayScore;
        stats[match.awayTeamId].goalsAgainst += match.homeScore;
    }
    return stats;
}
function applyHeadToHeadCriteria(records, groupMatches) {
    let buckets = [records];
    const criteria = [
        (bucket) => {
            const h2h = headToHeadStats(bucket, groupMatches);
            return (record) => h2h[record.teamId].points;
        },
        (bucket) => {
            const h2h = headToHeadStats(bucket, groupMatches);
            return (record) => goalDifference(h2h[record.teamId]);
        },
        (bucket) => {
            const h2h = headToHeadStats(bucket, groupMatches);
            return (record) => h2h[record.teamId].goalsFor;
        },
    ];
    for (const criterion of criteria) {
        buckets = buckets.flatMap((bucket) => {
            if (bucket.length <= 1)
                return [bucket];
            return groupByValue(bucket, criterion(bucket));
        });
    }
    return buckets;
}
function resolveHeadToHeadTies(records, groupMatches) {
    if (records.length <= 1)
        return [records];
    const buckets = applyHeadToHeadCriteria(records, groupMatches);
    if (buckets.length === 1)
        return [records];
    return buckets.flatMap((bucket) => bucket.length <= 1 ? [bucket] : resolveHeadToHeadTies(bucket, groupMatches));
}
function applyOverallTieBreakers(buckets) {
    const criteria = [
        () => (record) => record.goalDifference,
        () => (record) => record.goalsFor,
        () => (record) => record.conduct,
        () => (record) => rankingValue(record),
    ];
    for (const criterion of criteria) {
        buckets = buckets.flatMap((bucket) => {
            if (bucket.length <= 1)
                return [bucket];
            return groupByValue(bucket, criterion());
        });
    }
    return buckets;
}
function breakPointTie(records, groupMatches) {
    const headToHeadBuckets = resolveHeadToHeadTies(records, groupMatches);
    const resolvedBuckets = applyOverallTieBreakers(headToHeadBuckets);
    return resolvedBuckets.flatMap((bucket) => [...bucket].sort((a, b) => rankingValue(b) - rankingValue(a) || a.teamId.localeCompare(b.teamId)));
}
function rankGroupRecords(records, groupMatches) {
    const pointBuckets = groupByValue(records, (record) => record.points);
    return pointBuckets.flatMap((bucket) => (bucket.length === 1 ? bucket : breakPointTie(bucket, groupMatches)));
}
function isOnOfficialRoster(teamId) {
    return groupLetters.some((group) => OFFICIAL_GROUP_ASSIGNMENTS[group].includes(teamId));
}
function buildTeamsByGroup(teamsById) {
    return groupLetters.reduce((accumulator, group) => {
        const rosterTeams = OFFICIAL_GROUP_ASSIGNMENTS[group]
            .map((teamId) => teamsById[teamId])
            .filter((team) => Boolean(team));
        const supplemental = Object.values(teamsById).filter((team) => team.group === group &&
            !isOnOfficialRoster(team.id) &&
            !rosterTeams.some((entry) => entry.id === team.id));
        accumulator[group] = [...rosterTeams, ...supplemental];
        return accumulator;
    }, {});
}
export function computeStandings(scoredMatches, teams) {
    const teamsById = Object.fromEntries(teams.map((team) => {
        const canonicalId = resolveCanonicalTeamId(team.id, team);
        return [canonicalId, { ...team, id: canonicalId }];
    }));
    const teamsByGroup = buildTeamsByGroup(teamsById);
    return groupLetters.map((group) => {
        const groupMatches = scoredMatches.filter((match) => {
            const homeId = resolveCanonicalTeamId(match.homeTeamId, teamsById[match.homeTeamId]);
            const awayId = resolveCanonicalTeamId(match.awayTeamId, teamsById[match.awayTeamId]);
            const roster = OFFICIAL_GROUP_ASSIGNMENTS[group];
            if (roster.includes(homeId) && roster.includes(awayId))
                return true;
            return match.group === group;
        });
        const rows = (teamsByGroup[group] ?? []).map((team) => {
            const record = {
                teamId: team.id,
                group,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0,
                conduct: 0,
                rating: team.rating,
                fifaRank: team.fifaRank,
            };
            for (const match of groupMatches) {
                const homeId = resolveCanonicalTeamId(match.homeTeamId, teamsById[match.homeTeamId]);
                const awayId = resolveCanonicalTeamId(match.awayTeamId, teamsById[match.awayTeamId]);
                const isHome = homeId === team.id;
                const isAway = awayId === team.id;
                if (!isHome && !isAway)
                    continue;
                const goalsFor = isHome ? match.homeScore : match.awayScore;
                const goalsAgainst = isHome ? match.awayScore : match.homeScore;
                record.played += 1;
                record.goalsFor += goalsFor;
                record.goalsAgainst += goalsAgainst;
                record.points += matchResultPoints(goalsFor, goalsAgainst);
                record.conduct += isHome ? match.homeConduct : match.awayConduct;
                if (goalsFor > goalsAgainst)
                    record.wins += 1;
                else if (goalsFor === goalsAgainst)
                    record.draws += 1;
                else
                    record.losses += 1;
            }
            record.goalDifference = goalDifference(record);
            return record;
        });
        return {
            group,
            rows: rankGroupRecords(rows, groupMatches),
        };
    });
}
export function rankBestThirds(standings) {
    const thirds = standings
        .map((standing) => standing.rows[2])
        .filter((r) => Boolean(r));
    return rankThirdPlaceRecords(thirds);
}
//# sourceMappingURL=standings.js.map