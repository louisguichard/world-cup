import { thirdPlaceMap } from "../data/thirdPlaceMap";
import { knockoutSchedule } from "../data/knockoutSchedule";
import type {
  BracketGhostCandidate,
  BracketMatch,
  BracketSlotCertainty,
  GroupLetter,
  GroupStanding,
  Match,
  MatchWithScore,
  PolymarketMatchMarket,
  ScoreOverride,
  Stage,
  Team,
  TeamRecord,
  TeamSimulationSummary,
  TournamentProjection,
  TournamentSimulationResult
} from "../types";
import { groupLetters } from "../types";
import { clamp, normalizeName, pairKey } from "./normalize";
import { knockoutScore, knockoutWinProbability, makeFallbackPrediction, normalizeProbabilities, samplePredictedScore } from "./predictions";

type TeamsById = Record<string, Team>;

const FORM_LOGIT_SCALE = 180;
const PROJECTED_FORM_K = 8;
const PROJECTED_FORM_CAP = 36;

const roundOf32Definitions = [
  ["M73", "2A", "2B"],
  ["M74", "1E", "3:1E"],
  ["M75", "1F", "2C"],
  ["M76", "1C", "2F"],
  ["M77", "1I", "3:1I"],
  ["M78", "2E", "2I"],
  ["M79", "1A", "3:1A"],
  ["M80", "1L", "3:1L"],
  ["M81", "1D", "3:1D"],
  ["M82", "1G", "3:1G"],
  ["M83", "2K", "2L"],
  ["M84", "1H", "2J"],
  ["M85", "1B", "3:1B"],
  ["M86", "1J", "2H"],
  ["M87", "1K", "3:1K"],
  ["M88", "2D", "2G"]
] as const;

const nextRoundDefinitions: Record<Exclude<Stage, "R32">, Array<[string, string, string]>> = {
  R16: [
    ["M89", "W74", "W77"],
    ["M90", "W73", "W75"],
    ["M91", "W76", "W78"],
    ["M92", "W79", "W80"],
    ["M93", "W83", "W84"],
    ["M94", "W81", "W82"],
    ["M95", "W86", "W88"],
    ["M96", "W85", "W87"]
  ],
  QF: [
    ["M97", "W89", "W90"],
    ["M98", "W93", "W94"],
    ["M99", "W91", "W92"],
    ["M100", "W95", "W96"]
  ],
  SF: [
    ["M101", "W97", "W98"],
    ["M102", "W99", "W100"]
  ],
  Final: [["M104", "W101", "W102"]]
};

function goalDifference(record: Pick<TeamRecord, "goalsFor" | "goalsAgainst">): number {
  return record.goalsFor - record.goalsAgainst;
}

function matchResultPoints(goalsFor: number, goalsAgainst: number): number {
  if (goalsFor > goalsAgainst) return 3;
  if (goalsFor === goalsAgainst) return 1;
  return 0;
}

function matchResultShare(goalsFor: number, goalsAgainst: number): number {
  if (goalsFor > goalsAgainst) return 1;
  if (goalsFor === goalsAgainst) return 0.5;
  return 0;
}

function expectedResultShare(homeRating: number, awayRating: number): number {
  return 1 / (1 + Math.exp(-(homeRating - awayRating) / FORM_LOGIT_SCALE));
}

function formMarginMultiplier(homeScore: number, awayScore: number): number {
  return 1 + Math.min(0.65, Math.log1p(Math.abs(homeScore - awayScore)) * 0.35);
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

function headToHeadStats(records: TeamRecord[], matches: MatchWithScore[]): Record<string, Pick<TeamRecord, "points" | "goalsFor" | "goalsAgainst">> {
  const ids = new Set(records.map((record) => record.teamId));
  const stats = Object.fromEntries(
    records.map((record) => [record.teamId, { points: 0, goalsFor: 0, goalsAgainst: 0 }])
  ) as Record<string, Pick<TeamRecord, "points" | "goalsFor" | "goalsAgainst">>;

  for (const match of matches) {
    if (!ids.has(match.homeTeamId) || !ids.has(match.awayTeamId)) {
      continue;
    }

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
    }
  ];

  for (const criterion of criteria) {
    buckets = buckets.flatMap((bucket) => {
      if (bucket.length <= 1) {
        return [bucket];
      }

      return groupByValue(bucket, criterion(bucket));
    });
  }

  return buckets;
}

function resolveHeadToHeadTies(records: TeamRecord[], groupMatches: MatchWithScore[]): TeamRecord[][] {
  if (records.length <= 1) {
    return [records];
  }

  const buckets = applyHeadToHeadCriteria(records, groupMatches);

  if (buckets.length === 1) {
    return [records];
  }

  return buckets.flatMap((bucket) => (bucket.length <= 1 ? [bucket] : resolveHeadToHeadTies(bucket, groupMatches)));
}

function applyOverallTieBreakers(buckets: TeamRecord[][]): TeamRecord[][] {
  const criteria = [
    () => (record: TeamRecord) => record.goalDifference,
    () => (record: TeamRecord) => record.goalsFor,
    () => (record: TeamRecord) => record.conduct,
    () => (record: TeamRecord) => rankingValue(record)
  ];

  for (const criterion of criteria) {
    buckets = buckets.flatMap((bucket) => {
      if (bucket.length <= 1) {
        return [bucket];
      }

      return groupByValue(bucket, criterion());
    });
  }

  return buckets;
}

function breakPointTie(records: TeamRecord[], groupMatches: MatchWithScore[]): TeamRecord[] {
  const headToHeadBuckets = resolveHeadToHeadTies(records, groupMatches);
  const resolvedBuckets = applyOverallTieBreakers(headToHeadBuckets);

  return resolvedBuckets.flatMap((bucket) =>
    [...bucket].sort((a, b) => rankingValue(b) - rankingValue(a) || a.teamId.localeCompare(b.teamId))
  );
}

function rankGroupRecords(records: TeamRecord[], groupMatches: MatchWithScore[]): TeamRecord[] {
  const pointBuckets = groupByValue(records, (record) => record.points);
  return pointBuckets.flatMap((bucket) => (bucket.length === 1 ? bucket : breakPointTie(bucket, groupMatches)));
}

export function toTeamsById(teams: Team[]): TeamsById {
  return Object.fromEntries(teams.map((team) => [team.id, team]));
}

export function materializeMatches(
  matches: Match[],
  teamsById: TeamsById,
  overrides: Record<string, ScoreOverride> = {},
  random?: () => number
): MatchWithScore[] {
  return matches.map((match) => {
    const override = overrides[match.id];

    if (override) {
      return {
        ...match,
        homeScore: override.homeScore,
        awayScore: override.awayScore,
        source: "manual"
      };
    }

    if (typeof match.homeScore === "number" && typeof match.awayScore === "number") {
      return {
        ...match,
        homeScore: match.homeScore,
        awayScore: match.awayScore
      };
    }

    const prediction =
      match.prediction ?? makeFallbackPrediction(teamsById[match.homeTeamId], teamsById[match.awayTeamId], match.id);
    const score = random
      ? samplePredictedScore(prediction, random)
      : {
          homeScore: prediction.predictedHomeScore,
          awayScore: prediction.predictedAwayScore
        };

    return {
      ...match,
      homeScore: score.homeScore,
      awayScore: score.awayScore,
      prediction,
      source: match.prediction?.method === "polymarket" ? "polymarket" : "model"
    };
  });
}

function applyProjectedGroupForm(teams: Team[], scoredMatches: MatchWithScore[]): Team[] {
  const teamsById = toTeamsById(teams);
  const shifts = Object.fromEntries(teams.map((team) => [team.id, 0])) as Record<string, number>;
  const projectedMatches = scoredMatches
    .filter((match) => match.source !== "espn")
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  for (const match of projectedMatches) {
    const home = teamsById[match.homeTeamId];
    const away = teamsById[match.awayTeamId];
    if (!home || !away) continue;

    const expected = expectedResultShare(home.rating + shifts[home.id], away.rating + shifts[away.id]);
    const actual = matchResultShare(match.homeScore, match.awayScore);
    const step = clamp(PROJECTED_FORM_K * formMarginMultiplier(match.homeScore, match.awayScore) * (actual - expected), -7, 7);

    shifts[home.id] = clamp(shifts[home.id] + step, -PROJECTED_FORM_CAP, PROJECTED_FORM_CAP);
    shifts[away.id] = clamp(shifts[away.id] - step, -PROJECTED_FORM_CAP, PROJECTED_FORM_CAP);
  }

  return teams.map((team) => ({
    ...team,
    rating: Math.round(team.rating + shifts[team.id])
  }));
}

export function computeStandings(scoredMatches: MatchWithScore[], teams: Team[]): GroupStanding[] {
  const teamsByGroup = teams.reduce<Partial<Record<GroupLetter, Team[]>>>((accumulator, team) => {
    const bucket = accumulator[team.group] ?? [];
    bucket.push(team);
    accumulator[team.group] = bucket;
    return accumulator;
  }, {});

  return groupLetters.map((group) => {
    const groupMatches = scoredMatches.filter((match) => match.group === group);
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
        fifaRank: team.fifaRank
      };

      for (const match of groupMatches) {
        const isHome = match.homeTeamId === team.id;
        const isAway = match.awayTeamId === team.id;

        if (!isHome && !isAway) {
          continue;
        }

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
      rows: rankGroupRecords(rows, groupMatches)
    };
  });
}

export function rankBestThirds(standings: GroupStanding[]): TeamRecord[] {
  return standings
    .map((standing) => standing.rows[2])
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        b.conduct - a.conduct ||
        rankingValue(b) - rankingValue(a)
    );
}

function seedToTeamId(seed: string, standingsByGroup: Record<GroupLetter, TeamRecord[]>, thirdMapping: Record<string, string>): string | undefined {
  if (seed.startsWith("3:")) {
    const group = thirdMapping[seed.slice(2)] as GroupLetter | undefined;
    return group ? standingsByGroup[group]?.[2]?.teamId : undefined;
  }

  const rank = Number(seed[0]) - 1;
  const group = seed[1] as GroupLetter;
  return standingsByGroup[group]?.[rank]?.teamId;
}

function seedLabel(seed: string, thirdMapping: Record<string, string>): string {
  if (seed.startsWith("3:")) {
    const group = thirdMapping[seed.slice(2)];
    return group ? `3${group}` : "3?";
  }

  return seed;
}

function playKnockoutMatch(
  id: string,
  stage: Stage,
  homeTeamId: string | undefined,
  awayTeamId: string | undefined,
  teamsById: TeamsById,
  knockoutMarkets: PolymarketMatchMarket[] = [],
  random?: () => number,
  picks: Record<string, string> = {},
  homeSeedLabel?: string,
  awaySeedLabel?: string
): BracketMatch {
  const home = homeTeamId ? teamsById[homeTeamId] : undefined;
  const away = awayTeamId ? teamsById[awayTeamId] : undefined;

  if (!home || !away) {
    return {
      id,
      stage,
      label: id,
      homeTeamId,
      awayTeamId,
      homeSeedLabel,
      awaySeedLabel,
      source: "simulated"
    };
  }

  const marketProbability = knockoutMarketProbability(id, home, away, knockoutMarkets);
  const probability = marketProbability?.homeWinProbability ?? knockoutWinProbability(home, away);
  const pick = picks[id];
  const manual = !random && (pick === home.id || pick === away.id);
  const winnerTeamId = manual
    ? pick
    : random
      ? random() <= probability
        ? home.id
        : away.id
      : probability >= 0.5
        ? home.id
        : away.id;
  const score: Partial<ReturnType<typeof knockoutScore>> = random ? {} : knockoutScore(home, away, winnerTeamId);

  return {
    id,
    stage,
    label: id,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeSeedLabel,
    awaySeedLabel,
    homeScore: score.homeScore,
    awayScore: score.awayScore,
    winnerTeamId,
    winProbability: winnerTeamId === home.id ? probability : 1 - probability,
    homeWinProbability: probability,
    probabilityMethod: marketProbability ? "polymarket" : "model",
    marketSlug: marketProbability?.marketSlug,
    source: "simulated",
    manual,
    note: score.note
  };
}

function knockoutMarketProbability(
  matchId: string,
  home: Team,
  away: Team,
  knockoutMarkets: PolymarketMatchMarket[]
): { homeWinProbability: number; marketSlug?: string } | undefined {
  const schedule = knockoutSchedule[matchId];
  if (!schedule) return undefined;

  const homeKey = normalizeName(home.name);
  const awayKey = normalizeName(away.name);
  const matchPairKey = pairKey(homeKey, awayKey);
  const matchTime = Date.parse(schedule.date);
  const candidate = knockoutMarkets
    .filter((market) => pairKey(market.teamAKey, market.teamBKey) === matchPairKey)
    .map((market) => ({
      market,
      diff: Math.abs(Date.parse(market.date) - matchTime)
    }))
    .filter(({ diff }) => Number.isFinite(diff) && diff < 48 * 60 * 60 * 1000)
    .sort((a, b) => {
      if (a.market.kind !== b.market.kind) return a.market.kind === "advance" ? -1 : 1;
      return a.diff - b.diff;
    })[0]?.market;

  if (!candidate) return undefined;

  if (typeof candidate.teamAAdvanceProbability === "number") {
    const homeWinProbability =
      candidate.teamAKey === homeKey ? candidate.teamAAdvanceProbability : 1 - candidate.teamAAdvanceProbability;
    return {
      homeWinProbability: clamp(homeWinProbability, 0.01, 0.99),
      marketSlug: candidate.marketSlug
    };
  }

  if (candidate.probabilities) {
    const oriented =
      candidate.teamAKey === homeKey
        ? candidate.probabilities
        : {
            homeWin: candidate.probabilities.awayWin,
            draw: candidate.probabilities.draw,
            awayWin: candidate.probabilities.homeWin
          };
    const normalized = normalizeProbabilities(oriented);
    const drawSplit = knockoutWinProbability(home, away);
    return {
      homeWinProbability: clamp(normalized.homeWin + normalized.draw * drawSplit, 0.01, 0.99),
      marketSlug: candidate.marketSlug
    };
  }

  return undefined;
}

function bracketWinners(matches: BracketMatch[]): Record<string, string | undefined> {
  return Object.fromEntries(matches.map((match) => [`W${match.id.replace("M", "")}`, match.winnerTeamId]));
}

function buildBracketFromStandings(
  standings: GroupStanding[],
  teamsById: TeamsById,
  knockoutMarkets: PolymarketMatchMarket[] = [],
  random?: () => number,
  picks: Record<string, string> = {}
): BracketMatch[] {
  const standingsByGroup = Object.fromEntries(
    standings.map((standing) => [standing.group, standing.rows])
  ) as Record<GroupLetter, TeamRecord[]>;
  const qualifiedThirdGroups = rankBestThirds(standings)
    .slice(0, 8)
    .map((record) => record.group)
    .sort()
    .join("");
  const thirdMapping = thirdPlaceMap[qualifiedThirdGroups] ?? {};

  const r32 = roundOf32Definitions.map(([id, homeSeed, awaySeed]) =>
    playKnockoutMatch(
      id,
      "R32",
      seedToTeamId(homeSeed, standingsByGroup, thirdMapping),
      seedToTeamId(awaySeed, standingsByGroup, thirdMapping),
      teamsById,
      knockoutMarkets,
      random,
      picks,
      seedLabel(homeSeed, thirdMapping),
      seedLabel(awaySeed, thirdMapping)
    )
  );

  const allMatches = [...r32];

  for (const stage of ["R16", "QF", "SF", "Final"] as const) {
    const winners = bracketWinners(allMatches);
    const stageMatches = nextRoundDefinitions[stage].map(([id, homeSeed, awaySeed]) =>
      playKnockoutMatch(id, stage, winners[homeSeed], winners[awaySeed], teamsById, knockoutMarkets, random, picks, homeSeed, awaySeed)
    );
    allMatches.push(...stageMatches);
  }

  return allMatches;
}

// ─── Bracket slot certainty annotation ──────────────────────────────────────
//
// Avoids importing from qualification.ts (which imports computeStandings from
// this module) — the logic is a direct copy of the pure helpers there.

// Mirrors qualification helpers without importing (circular dependency).

function expectedMatchesPerTeamBracket(groupSize: number): number {
  return Math.max(1, groupSize - 1);
}

function matchesInGroupBracket(groupSize: number): number {
  return (groupSize * (groupSize - 1)) / 2;
}

function maxPossiblePoints(record: TeamRecord, expectedPlayed: number): number {
  const remaining = Math.max(0, expectedPlayed - record.played);
  return record.points + remaining * 3;
}

type SlotConfirmedOptions = {
  lockedGroupMatchCount?: number;
  groupSize?: number;
  lockedRows?: TeamRecord[];
};

function isSlotConfirmed(row: TeamRecord, rows: TeamRecord[], opts: SlotConfirmedOptions = {}): boolean {
  const groupSize = opts.groupSize ?? (rows.length || 4);
  const expectedPlayed = expectedMatchesPerTeamBracket(groupSize);
  const requiredLockedMatches = matchesInGroupBracket(groupSize);

  const confirmRows = opts.lockedRows !== undefined ? opts.lockedRows : rows;
  if (confirmRows.length === 0) return false;
  const confirmRow = confirmRows.find((r) => r.teamId === row.teamId);
  if (!confirmRow || confirmRow.played < expectedPlayed) return false;

  const groupComplete = confirmRows.length > 0 && confirmRows.every((r) => r.played >= expectedPlayed);
  if (!groupComplete) return false;

  if (
    opts.lockedRows !== undefined
      ? (opts.lockedGroupMatchCount ?? 0) < requiredLockedMatches
      : opts.lockedGroupMatchCount !== undefined &&
        opts.lockedGroupMatchCount < requiredLockedMatches
  ) {
    return false;
  }

  const finalRank = confirmRows.findIndex((r) => r.teamId === row.teamId);
  return finalRank >= 0 && finalRank < 2;
}

/**
 * Parse a seed label string such as "2A", "1E", "3B" into rank + group.
 * Returns null for labels that don't match this pattern (e.g. "W74", "3?").
 */
function parseSeedLabelToGroupSlot(label: string): { rank: number; group: GroupLetter } | null {
  if (label.length < 2) return null;
  const rank = parseInt(label[0], 10);
  const group = label[1] as GroupLetter;
  if (isNaN(rank) || rank < 1 || rank > 4 || !/^[A-L]$/.test(group)) return null;
  return { rank, group };
}

// Rough probability estimates for ghost candidates ranked below the projected winner.
const GHOST_FREQ = [0.35, 0.15] as const;

function computeR32SlotAnnotation(
  projectedTeamId: string,
  parsed: { rank: number; group: GroupLetter },
  standingsMap: Map<GroupLetter, TeamRecord[]>,
  lockedGroupMatchCount?: number,
  lockedStandingsByGroup: Partial<Record<GroupLetter, TeamRecord[]>> = {}
): { certainty: BracketSlotCertainty; ghosts: BracketGhostCandidate[] } {
  const groupRows = standingsMap.get(parsed.group);
  if (!groupRows) return { certainty: "tbd", ghosts: [] };

  const row = groupRows.find((r) => r.teamId === projectedTeamId);
  if (!row) return { certainty: "tbd", ghosts: [] };

  const certainty: BracketSlotCertainty = isSlotConfirmed(row, groupRows, {
    groupSize: groupRows.length,
    lockedGroupMatchCount,
    lockedRows: lockedStandingsByGroup[parsed.group]
  })
    ? "confirmed"
    : "projected";

  if (certainty === "confirmed") {
    return { certainty, ghosts: [] };
  }

  const projectedIdx = groupRows.findIndex((r) => r.teamId === projectedTeamId);

  const others = groupRows
    .filter((r) => r.teamId !== projectedTeamId)
    .map((r) => ({ r, dist: Math.abs(groupRows.findIndex((x) => x.teamId === r.teamId) - projectedIdx) }))
    .sort((a, b) => a.dist - b.dist || 0)
    .slice(0, 2);

  const ghosts: BracketGhostCandidate[] = others.map(({ r }, i) => ({
    teamId: r.teamId,
    frequency: GHOST_FREQ[i] ?? 0.05
  }));

  return { certainty, ghosts };
}

function certaintyForUpstreamWinner(
  upstream: BracketMatch | undefined,
  winnerId: string | undefined
): BracketSlotCertainty {
  if (!winnerId) return "tbd";
  if (!upstream) return "projected";
  if (upstream.homeTeamId === winnerId) {
    return upstream.homeCertainty ?? "projected";
  }
  if (upstream.awayTeamId === winnerId) {
    return upstream.awayCertainty ?? "projected";
  }
  return "projected";
}

function propagateUpstreamGhost(
  upstream: BracketMatch | undefined,
  projectedWinnerId: string | undefined
): BracketGhostCandidate[] {
  if (!upstream || !projectedWinnerId) return [];
  // The loser of the upstream match is the ghost: they could have won instead.
  const loserId =
    upstream.homeTeamId === projectedWinnerId ? upstream.awayTeamId : upstream.homeTeamId;
  if (!loserId) return [];
  return [{ teamId: loserId, frequency: 0.2 }];
}

/**
 * Annotates each BracketMatch with slot certainty ("confirmed" | "projected" |
 * "tbd") and up to 2 ghost candidates per side.
 *
 * R32 slots are derived directly from group standings — no simulation required.
 * R16+ slots propagate the upstream loser as a single ghost candidate.
 */
export function annotateBracketCertainty(
  bracket: BracketMatch[],
  standings: GroupStanding[],
  lockedGroupMatchCount: Partial<Record<GroupLetter, number>> = {},
  lockedStandingsByGroup: Partial<Record<GroupLetter, TeamRecord[]>> = {}
): BracketMatch[] {
  const standingsMap = new Map<GroupLetter, TeamRecord[]>(
    standings.map((s) => [s.group, s.rows])
  );
  const annotatedById = new Map<string, BracketMatch>();

  const annotated: BracketMatch[] = [];

  for (const match of bracket) {
    if (match.stage === "R32") {
      const homeParsed = match.homeSeedLabel ? parseSeedLabelToGroupSlot(match.homeSeedLabel) : null;
      const awayParsed = match.awaySeedLabel ? parseSeedLabelToGroupSlot(match.awaySeedLabel) : null;

      const home =
        homeParsed && match.homeTeamId
          ? computeR32SlotAnnotation(
              match.homeTeamId,
              homeParsed,
              standingsMap,
              lockedGroupMatchCount[homeParsed.group],
              lockedStandingsByGroup
            )
          : { certainty: "tbd" as BracketSlotCertainty, ghosts: [] };

      const away =
        awayParsed && match.awayTeamId
          ? computeR32SlotAnnotation(
              match.awayTeamId,
              awayParsed,
              standingsMap,
              lockedGroupMatchCount[awayParsed.group],
              lockedStandingsByGroup
            )
          : { certainty: "tbd" as BracketSlotCertainty, ghosts: [] };

      annotated.push({
        ...match,
        homeCertainty: home.certainty,
        awayCertainty: away.certainty,
        homeGhosts: home.ghosts.length > 0 ? home.ghosts : undefined,
        awayGhosts: away.ghosts.length > 0 ? away.ghosts : undefined
      });
      annotatedById.set(match.id, annotated[annotated.length - 1]!);
      continue;
    }

    const homeUpstreamId = match.homeSeedLabel?.startsWith("W")
      ? `M${match.homeSeedLabel.slice(1)}`
      : null;
    const awayUpstreamId = match.awaySeedLabel?.startsWith("W")
      ? `M${match.awaySeedLabel.slice(1)}`
      : null;

    const homeUpstream = homeUpstreamId ? annotatedById.get(homeUpstreamId) : undefined;
    const awayUpstream = awayUpstreamId ? annotatedById.get(awayUpstreamId) : undefined;

    const homeCertainty = certaintyForUpstreamWinner(homeUpstream, match.homeTeamId);
    const awayCertainty = certaintyForUpstreamWinner(awayUpstream, match.awayTeamId);

    const homeGhosts =
      homeCertainty === "confirmed"
        ? undefined
        : propagateUpstreamGhost(homeUpstream, match.homeTeamId) || undefined;
    const awayGhosts =
      awayCertainty === "confirmed"
        ? undefined
        : propagateUpstreamGhost(awayUpstream, match.awayTeamId) || undefined;

    annotated.push({
      ...match,
      homeCertainty,
      awayCertainty,
      homeGhosts,
      awayGhosts
    });
    annotatedById.set(match.id, annotated[annotated.length - 1]!);
  }

  return annotated;
}

// ────────────────────────────────────────────────────────────────────────────

export function projectTournament(
  teams: Team[],
  matches: Match[],
  knockoutMarkets: PolymarketMatchMarket[] = [],
  overrides: Record<string, ScoreOverride> = {},
  bracketPicks: Record<string, string> = {},
  lockedGroupMatchCount: Partial<Record<GroupLetter, number>> = {},
  lockedStandingsByGroup: Partial<Record<GroupLetter, TeamRecord[]>> = {}
): TournamentProjection {
  const teamsById = toTeamsById(teams);
  const scoredMatches = materializeMatches(matches, teamsById, overrides);
  const standings = computeStandings(scoredMatches, teams);
  const bestThirds = rankBestThirds(standings);
  const qualifiedThirdGroups = bestThirds
    .slice(0, 8)
    .map((record) => record.group)
    .sort();
  const bracketTeamsById = toTeamsById(applyProjectedGroupForm(teams, scoredMatches));
  const rawBracket = buildBracketFromStandings(standings, bracketTeamsById, knockoutMarkets, undefined, bracketPicks);
  const bracket = annotateBracketCertainty(
    rawBracket,
    standings,
    lockedGroupMatchCount,
    lockedStandingsByGroup
  );

  return {
    scoredMatches,
    standings,
    bestThirds,
    qualifiedThirdGroups,
    bracket
  };
}

export function simulateChampionOdds(
  teams: Team[],
  matches: Match[],
  knockoutMarkets: PolymarketMatchMarket[] = [],
  iterations = 3000,
  seed = 4242
): Array<{ teamId: string; probability: number }> {
  return simulateTournamentOutcomes(teams, matches, knockoutMarkets, iterations, seed).championOdds;
}

function makeSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function emptyStageCounts(): Record<"R32" | "R16" | "QF" | "SF" | "Final" | "Champion", number> {
  return { R32: 0, R16: 0, QF: 0, SF: 0, Final: 0, Champion: 0 };
}

function emptyOpponentCounts(): Record<Stage, Map<string, number>> {
  return {
    R32: new Map(),
    R16: new Map(),
    QF: new Map(),
    SF: new Map(),
    Final: new Map()
  };
}

function addConditionalOpponent(
  state: { stageCounts: ReturnType<typeof emptyStageCounts>; opponentCounts: Record<Stage, Map<string, number>> },
  stage: Stage,
  opponentId: string | undefined
): void {
  if (!opponentId) return;
  state.stageCounts[stage] += 1;
  state.opponentCounts[stage].set(opponentId, (state.opponentCounts[stage].get(opponentId) ?? 0) + 1);
}

function summarizeTeamSimulation(
  teamId: string,
  iterations: number,
  stageCounts: ReturnType<typeof emptyStageCounts>,
  opponentCounts: Record<Stage, Map<string, number>>
): TeamSimulationSummary {
  return {
    teamId,
    iterations,
    stageReach: {
      R32: stageCounts.R32 / iterations,
      R16: stageCounts.R16 / iterations,
      QF: stageCounts.QF / iterations,
      SF: stageCounts.SF / iterations,
      Final: stageCounts.Final / iterations,
      Champion: stageCounts.Champion / iterations
    },
    opponents: Object.fromEntries(
      Object.entries(opponentCounts).map(([stage, counts]) => {
        const denominator = stageCounts[stage as Stage] || 1;
        return [
          stage,
          [...counts.entries()]
            .map(([opponentId, count]) => ({
              opponentId,
              count,
              probability: count / denominator
            }))
            .sort((a, b) => b.count - a.count)
        ];
      })
    ) as TeamSimulationSummary["opponents"]
  };
}

export function simulateTournamentOutcomes(
  teams: Team[],
  matches: Match[],
  knockoutMarkets: PolymarketMatchMarket[] = [],
  iterations = 3000,
  seed = 4242
): TournamentSimulationResult {
  const teamsById = toTeamsById(teams);
  const stateByTeam = Object.fromEntries(
    teams.map((team) => [
      team.id,
      {
        stageCounts: emptyStageCounts(),
        opponentCounts: emptyOpponentCounts()
      }
    ])
  ) as Record<string, { stageCounts: ReturnType<typeof emptyStageCounts>; opponentCounts: Record<Stage, Map<string, number>> }>;
  const random = makeSeededRandom(seed);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const scoredMatches = materializeMatches(matches, teamsById, {}, random);
    const standings = computeStandings(scoredMatches, teams);
    const bracketTeamsById = toTeamsById(applyProjectedGroupForm(teams, scoredMatches));
    const bracket = buildBracketFromStandings(standings, bracketTeamsById, knockoutMarkets, random);

    for (const match of bracket) {
      if (!match.homeTeamId || !match.awayTeamId) continue;

      addConditionalOpponent(stateByTeam[match.homeTeamId], match.stage, match.awayTeamId);
      addConditionalOpponent(stateByTeam[match.awayTeamId], match.stage, match.homeTeamId);

      if (match.stage === "Final" && match.winnerTeamId) {
        stateByTeam[match.winnerTeamId].stageCounts.Champion += 1;
      }
    }
  }

  const teamSummaries = Object.fromEntries(
    teams.map((team) => [
      team.id,
      summarizeTeamSimulation(team.id, iterations, stateByTeam[team.id].stageCounts, stateByTeam[team.id].opponentCounts)
    ])
  );

  return {
    championOdds: teams
      .map((team) => ({
        teamId: team.id,
        probability: stateByTeam[team.id].stageCounts.Champion / iterations
      }))
      .sort((a, b) => b.probability - a.probability),
    teamSummaries
  };
}

export function simulateTeamPath(
  teams: Team[],
  matches: Match[],
  knockoutMarkets: PolymarketMatchMarket[] = [],
  selectedTeamId: string,
  iterations = 2500,
  seed = 2026
): TeamSimulationSummary {
  return simulateTournamentOutcomes(teams, matches, knockoutMarkets, iterations, seed).teamSummaries[selectedTeamId];
}
