import { OFFICIAL_GROUP_ASSIGNMENTS } from "./officialGroupAssignments.js";
import {
  groupLetters,
  type GroupLetter,
  type GroupStanding,
  type MatchWithScore,
  type Team,
  type TeamRecord,
} from "./engineTypes.js";
import { resolveCanonicalTeamId } from "./teamId.js";
import { rankThirdPlaceRecords } from "./thirdPlaceRanking.js";

type TeamsById = Record<string, Team>;

function goalDifference(record: Pick<TeamRecord, "goalsFor" | "goalsAgainst">): number {
  return record.goalsFor - record.goalsAgainst;
}

function matchResultPoints(goalsFor: number, goalsAgainst: number): number {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
}

function rankingValue(record: TeamRecord): number {
  return record.fifaRank ? 10000 - record.fifaRank : record.rating;
}

function groupByValue(records: TeamRecord[], valueFor: (record: TeamRecord) => number): TeamRecord[][] {
  const buckets = new Map<number, TeamRecord[]>();
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

function headToHeadStats(
  records: TeamRecord[],
  matches: MatchWithScore[]
): Record<string, Pick<TeamRecord, "points" | "goalsFor" | "goalsAgainst">> {
  const ids = new Set(records.map((record) => record.teamId));
  const stats = Object.fromEntries(
    records.map((record) => [record.teamId, { points: 0, goalsFor: 0, goalsAgainst: 0 }])
  ) as Record<string, Pick<TeamRecord, "points" | "goalsFor" | "goalsAgainst">>;

  for (const match of matches) {
    if (!ids.has(match.homeTeamId) || !ids.has(match.awayTeamId)) continue;
    stats[match.homeTeamId].points += matchResultPoints(match.homeScore, match.awayScore);
    stats[match.homeTeamId].goalsFor += match.homeScore;
    stats[match.homeTeamId].goalsAgainst += match.awayScore;
    stats[match.awayTeamId].points += matchResultPoints(match.awayScore, match.homeScore);
    stats[match.awayTeamId].goalsFor += match.awayScore;
    stats[match.awayTeamId].goalsAgainst += match.homeScore;
  }

  return stats;
}

function applyHeadToHeadCriteria(records: TeamRecord[], groupMatches: MatchWithScore[]): TeamRecord[][] {
  let buckets = [records];
  const criteria = [
    (bucket: TeamRecord[]) => {
      const h2h = headToHeadStats(bucket, groupMatches);
      return (record: TeamRecord) => h2h[record.teamId].points;
    },
    (bucket: TeamRecord[]) => {
      const h2h = headToHeadStats(bucket, groupMatches);
      return (record: TeamRecord) => goalDifference(h2h[record.teamId]);
    },
    (bucket: TeamRecord[]) => {
      const h2h = headToHeadStats(bucket, groupMatches);
      return (record: TeamRecord) => h2h[record.teamId].goalsFor;
    },
  ];

  for (const criterion of criteria) {
    buckets = buckets.flatMap((bucket) => {
      if (bucket.length <= 1) return [bucket];
      return groupByValue(bucket, criterion(bucket));
    });
  }

  return buckets;
}

function resolveHeadToHeadTies(records: TeamRecord[], groupMatches: MatchWithScore[]): TeamRecord[][] {
  if (records.length <= 1) return [records];
  const buckets = applyHeadToHeadCriteria(records, groupMatches);
  if (buckets.length === 1) return [records];
  return buckets.flatMap((bucket) =>
    bucket.length <= 1 ? [bucket] : resolveHeadToHeadTies(bucket, groupMatches)
  );
}

function breakPointTie(records: TeamRecord[], groupMatches: MatchWithScore[]): TeamRecord[] {
  let buckets: TeamRecord[][] = [records];

  // Steps 2–3: overall goal difference and goals scored (all group matches).
  for (const valueFor of [
    (record: TeamRecord) => record.goalDifference,
    (record: TeamRecord) => record.goalsFor,
  ]) {
    buckets = buckets.flatMap((bucket) => {
      if (bucket.length <= 1) return [bucket];
      return groupByValue(bucket, valueFor);
    });
  }

  // Steps 4–6: head-to-head sub-table among teams still tied.
  buckets = buckets.flatMap((bucket) =>
    bucket.length <= 1 ? [bucket] : resolveHeadToHeadTies(bucket, groupMatches)
  );

  // Step 7: fair play conduct points.
  buckets = buckets.flatMap((bucket) => {
    if (bucket.length <= 1) return [bucket];
    return groupByValue(bucket, (record) => record.conduct);
  });

  // Step 8: drawing of lots (stable team-id ordering as deterministic stand-in).
  return buckets.flatMap((bucket) =>
    [...bucket].sort((a, b) => rankingValue(b) - rankingValue(a) || a.teamId.localeCompare(b.teamId))
  );
}

function rankGroupRecords(records: TeamRecord[], groupMatches: MatchWithScore[]): TeamRecord[] {
  const pointBuckets = groupByValue(records, (record) => record.points);
  return pointBuckets.flatMap((bucket) => (bucket.length === 1 ? bucket : breakPointTie(bucket, groupMatches)));
}

function isOnOfficialRoster(teamId: string): boolean {
  return groupLetters.some((group) => OFFICIAL_GROUP_ASSIGNMENTS[group].includes(teamId));
}

function buildTeamsByGroup(teamsById: TeamsById): Partial<Record<GroupLetter, Team[]>> {
  return groupLetters.reduce<Partial<Record<GroupLetter, Team[]>>>((accumulator, group) => {
    const rosterTeams = OFFICIAL_GROUP_ASSIGNMENTS[group]
      .map((teamId) => teamsById[teamId])
      .filter((team): team is Team => Boolean(team));

    const supplemental = Object.values(teamsById).filter(
      (team) =>
        team.group === group &&
        !isOnOfficialRoster(team.id) &&
        !rosterTeams.some((entry) => entry.id === team.id)
    );

    accumulator[group] = [...rosterTeams, ...supplemental];
    return accumulator;
  }, {});
}

export function computeStandings(scoredMatches: MatchWithScore[], teams: Team[]): GroupStanding[] {
  const teamsById: TeamsById = Object.fromEntries(
    teams.map((team) => {
      const canonicalId = resolveCanonicalTeamId(team.id, team);
      return [canonicalId, { ...team, id: canonicalId }];
    })
  );

  const teamsByGroup = buildTeamsByGroup(teamsById);

  return groupLetters.map((group) => {
    const groupMatches = scoredMatches.filter((match) => {
      const homeId = resolveCanonicalTeamId(match.homeTeamId, teamsById[match.homeTeamId]);
      const awayId = resolveCanonicalTeamId(match.awayTeamId, teamsById[match.awayTeamId]);
      const roster = OFFICIAL_GROUP_ASSIGNMENTS[group];
      if (roster.includes(homeId) && roster.includes(awayId)) return true;
      return match.group === group;
    });

    const rows = (teamsByGroup[group] ?? []).map<TeamRecord>((team) => {
      const record: TeamRecord = {
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
        if (!isHome && !isAway) continue;

        const goalsFor = isHome ? match.homeScore : match.awayScore;
        const goalsAgainst = isHome ? match.awayScore : match.homeScore;
        record.played += 1;
        record.goalsFor += goalsFor;
        record.goalsAgainst += goalsAgainst;
        record.points += matchResultPoints(goalsFor, goalsAgainst);
        record.conduct += isHome ? match.homeConduct : match.awayConduct;

        if (goalsFor > goalsAgainst) record.wins += 1;
        else if (goalsFor === goalsAgainst) record.draws += 1;
        else record.losses += 1;
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

export function rankBestThirds(standings: GroupStanding[]): TeamRecord[] {
  const thirds = standings
    .map((standing) => standing.rows[2])
    .filter((r): r is TeamRecord => Boolean(r));
  return rankThirdPlaceRecords(thirds);
}
