/** Builds goal-by-goal best-third ranking snapshots for the timeline slider. */
import type { GroupLetter, GroupStanding, MatchEvent, MergedMatch, Team, TeamRecord } from "../types";
import { rankAliveBestThirds } from "./bestThirds";
import { buildQualificationContext } from "./qualification";
import { crossedCutoffForDelta } from "./thirdPlaceLiveStatus";
import { replayStandings, type ReplayMatch } from "./replayStandings";
import { resolveEventsForMatch } from "./resolveMatchEvents";
import type { QualificationMatchContext } from "./thirdPlaceQualification";

export type GoalEvent = {
  matchId: string;
  minute: number;
  scoringTeamId: string;
  homeScoreAfter: number;
  awayScoreAfter: number;
  isSynthesized?: boolean;
};

export type RankingDelta = {
  teamId: string;
  positionBefore: number;
  positionAfter: number;
  pointsDelta: number;
  gdDelta: number;
  crossedCutoff?: "in" | "out";
};

export type RankingSnapshotType = "match-start" | "goal" | "final-whistle" | "present";

export type RankingSnapshot = {
  id: string;
  type: RankingSnapshotType;
  matchId: string;
  minute: number;
  label: string;
  shortLabel: string;
  group: GroupLetter;
  scoringTeamId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  rankings: TeamRecord[];
  deltas: RankingDelta[];
};

export type BuildRankingTimelineInput = {
  matches: MergedMatch[];
  teams: Team[];
  matchEvents: Record<string, MatchEvent[]>;
  presentStandings: GroupStanding[];
  presentQualContext: QualificationMatchContext;
};

type SnapshotCandidate = {
  id: string;
  type: RankingSnapshotType;
  match: MergedMatch;
  minute: number;
  homeScore: number;
  awayScore: number;
  isCompleted: boolean;
  scoringTeamId?: string;
  sortKey: number;
};

const FINAL_MINUTE = 90;

function isGroupStageMatch(match: MergedMatch): boolean {
  return Boolean(match.group);
}

function teamAbbrev(teamId: string, teamsById: Record<string, Team>): string {
  return teamsById[teamId]?.abbreviation ?? teamId.slice(0, 3).toUpperCase();
}

function distributeMinutes(count: number): number[] {
  if (count <= 0) return [];
  const step = 90 / (count + 1);
  return Array.from({ length: count }, (_, index) => Math.round(step * (index + 1)));
}

function synthesizeGoalEvents(match: MergedMatch): GoalEvent[] {
  const homeTotal = match.homeScore ?? 0;
  const awayTotal = match.awayScore ?? 0;
  if (homeTotal === 0 && awayTotal === 0) return [];

  const homeMinutes = distributeMinutes(homeTotal);
  const awayMinutes = distributeMinutes(awayTotal);
  const ordered = [
    ...homeMinutes.map((minute) => ({ minute, side: "home" as const })),
    ...awayMinutes.map((minute) => ({ minute, side: "away" as const })),
  ].sort((a, b) => a.minute - b.minute || (a.side === "home" ? -1 : 1));

  let home = 0;
  let away = 0;
  const events: GoalEvent[] = [];

  for (const entry of ordered) {
    if (entry.side === "home") {
      home += 1;
      events.push({
        matchId: match.id,
        minute: entry.minute,
        scoringTeamId: match.homeTeamId,
        homeScoreAfter: home,
        awayScoreAfter: away,
        isSynthesized: true,
      });
    } else {
      away += 1;
      events.push({
        matchId: match.id,
        minute: entry.minute,
        scoringTeamId: match.awayTeamId,
        homeScoreAfter: home,
        awayScoreAfter: away,
        isSynthesized: true,
      });
    }
  }

  return events;
}

function extractGoalEvents(match: MergedMatch, matchEvents: Record<string, MatchEvent[]>): GoalEvent[] {
  const raw = resolveEventsForMatch(match, matchEvents).filter(
    (event) => event.type === "goal" || event.type === "own_goal"
  );

  if (raw.length > 0) {
    let home = 0;
    let away = 0;
    return [...raw]
      .sort(
        (a, b) =>
          a.minute - b.minute ||
          (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0) ||
          a.providerId.localeCompare(b.providerId)
      )
      .map((event) => {
        const scoringTeamId =
          event.type === "goal"
            ? event.teamId
            : event.teamId === match.homeTeamId
              ? match.awayTeamId
              : match.homeTeamId;

        if (scoringTeamId === match.homeTeamId) home += 1;
        else away += 1;

        return {
          matchId: match.id,
          minute: event.minute + (event.minuteExtra ?? 0) * 0.001,
          scoringTeamId,
          homeScoreAfter: home,
          awayScoreAfter: away,
          isSynthesized: false,
        };
      });
  }

  const hasScore =
    match.status === "completed" ||
    match.status === "live" ||
    match.locked ||
    match.homeScore !== undefined ||
    match.awayScore !== undefined;

  if (!hasScore) return [];
  return synthesizeGoalEvents(match);
}

function buildReplayState(
  allMatches: MergedMatch[],
  focusMatch: MergedMatch,
  homeScore: number,
  awayScore: number,
  isCompleted: boolean
): ReplayMatch[] {
  const focusTime = Date.parse(focusMatch.date);
  const replays: ReplayMatch[] = [];

  for (const match of allMatches) {
    const matchTime = Date.parse(match.date);
    const group = match.group;
    if (!group) continue;

    if (match.id === focusMatch.id) {
      replays.push({
        matchId: match.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        group,
        homeScore,
        awayScore,
        isCompleted,
      });
      continue;
    }

    if (Number.isNaN(matchTime) || Number.isNaN(focusTime)) continue;

    if (matchTime > focusTime) continue;

    if (matchTime < focusTime) {
      if (match.locked || match.status === "completed") {
        replays.push({
          matchId: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          group,
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
          isCompleted: true,
        });
      } else if ((match.homeScore ?? 0) > 0 || (match.awayScore ?? 0) > 0) {
        replays.push({
          matchId: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          group,
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
          isCompleted: false,
        });
      }
      continue;
    }

    if (match.date < focusMatch.date) {
      if (match.locked || match.status === "completed") {
        replays.push({
          matchId: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          group,
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
          isCompleted: true,
        });
      } else if ((match.homeScore ?? 0) > 0 || (match.awayScore ?? 0) > 0) {
        replays.push({
          matchId: match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          group,
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
          isCompleted: false,
        });
      }
    }
  }

  return replays;
}

function qualContextFromReplay(replayMatches: ReplayMatch[], teams: Team[]): QualificationMatchContext {
  const matches = replayMatches.map((replay) => ({
    id: replay.matchId,
    group: replay.group,
    date: "",
    homeTeamId: replay.homeTeamId,
    awayTeamId: replay.awayTeamId,
    homeScore: replay.homeScore,
    awayScore: replay.awayScore,
    status: replay.isCompleted ? ("completed" as const) : ("live" as const),
    homeConduct: 0,
    awayConduct: 0,
    locked: replay.isCompleted,
    source: "model" as const,
  }));

  return buildQualificationContext(matches, teams);
}

function computeDeltas(previous: TeamRecord[], current: TeamRecord[]): RankingDelta[] {
  const beforeRank = new Map(previous.map((row, index) => [row.teamId, index + 1]));
  const beforePoints = new Map(previous.map((row) => [row.teamId, row.points]));
  const beforeGd = new Map(previous.map((row) => [row.teamId, row.goalDifference]));

  return current.map((row, index) => {
    const positionBefore = beforeRank.get(row.teamId) ?? index + 1;
    const positionAfter = index + 1;
    const crossedCutoff = crossedCutoffForDelta(positionBefore, positionAfter);
    return {
      teamId: row.teamId,
      positionBefore,
      positionAfter,
      pointsDelta: row.points - (beforePoints.get(row.teamId) ?? row.points),
      gdDelta: row.goalDifference - (beforeGd.get(row.teamId) ?? row.goalDifference),
      ...(crossedCutoff ? { crossedCutoff } : {}),
    };
  });
}

function buildLabel(
  candidate: SnapshotCandidate,
  teamsById: Record<string, Team>
): { label: string; shortLabel: string } {
  const home = teamAbbrev(candidate.match.homeTeamId, teamsById);
  const away = teamAbbrev(candidate.match.awayTeamId, teamsById);
  const score = `${candidate.homeScore}–${candidate.awayScore}`;

  switch (candidate.type) {
    case "match-start":
      return {
        label: `${home} vs ${away} — Group ${candidate.match.group} kicks off`,
        shortLabel: `${home} vs ${away}`,
      };
    case "goal": {
      const scorer = candidate.scoringTeamId
        ? teamAbbrev(candidate.scoringTeamId, teamsById)
        : home;
      return {
        label: `${scorer} ${score} ${away} ${Math.round(candidate.minute)}'`,
        shortLabel: `${home} ${score} ${away}`,
      };
    }
    case "final-whistle":
      return {
        label: `Full time: ${home} ${score} ${away}`,
        shortLabel: `FT ${home} ${score} ${away}`,
      };
    case "present":
      return { label: "Live — current standings", shortLabel: "Now" };
    default: {
      const _exhaustive: never = candidate.type;
      return _exhaustive;
    }
  }
}

function candidateSortKey(match: MergedMatch, minute: number): number {
  return Date.parse(match.date) + minute / 1000;
}

function buildCandidates(
  groupMatches: MergedMatch[],
  matchEvents: Record<string, MatchEvent[]>
): SnapshotCandidate[] {
  const sorted = [...groupMatches].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id)
  );

  const candidates: SnapshotCandidate[] = [];

  for (const match of sorted) {
    const group = match.group;
    if (!group) continue;

    candidates.push({
      id: `${match.id}-kickoff`,
      type: "match-start",
      match,
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      isCompleted: false,
      sortKey: candidateSortKey(match, 0),
    });

    const goals = extractGoalEvents(match, matchEvents);
    goals.forEach((goal, index) => {
      candidates.push({
        id: `${match.id}-goal-${index + 1}`,
        type: "goal",
        match,
        minute: goal.minute,
        homeScore: goal.homeScoreAfter,
        awayScore: goal.awayScoreAfter,
        isCompleted: false,
        scoringTeamId: goal.scoringTeamId,
        sortKey: candidateSortKey(match, goal.minute),
      });
    });

    if (match.locked || match.status === "completed") {
      candidates.push({
        id: `${match.id}-ft`,
        type: "final-whistle",
        match,
        minute: FINAL_MINUTE,
        homeScore: match.homeScore ?? goals[goals.length - 1]?.homeScoreAfter ?? 0,
        awayScore: match.awayScore ?? goals[goals.length - 1]?.awayScoreAfter ?? 0,
        isCompleted: true,
        sortKey: candidateSortKey(match, FINAL_MINUTE),
      });
    }
  }

  return candidates.sort((a, b) => a.sortKey - b.sortKey);
}

/** Builds the complete ordered timeline of best-third ranking snapshots. */
export function buildRankingTimeline(input: BuildRankingTimelineInput): RankingSnapshot[] {
  const { matches, teams, matchEvents, presentStandings, presentQualContext } = input;
  const groupMatches = matches.filter(isGroupStageMatch);
  if (groupMatches.length === 0) return [];

  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const candidates = buildCandidates(groupMatches, matchEvents);
  const snapshots: RankingSnapshot[] = [];
  let previousRankings: TeamRecord[] = [];

  for (const candidate of candidates) {
    const replayMatches = buildReplayState(
      groupMatches,
      candidate.match,
      candidate.homeScore,
      candidate.awayScore,
      candidate.isCompleted
    );
    const standings = replayStandings(replayMatches, teams);
    const qualContext = qualContextFromReplay(replayMatches, teams);
    const rankings = rankAliveBestThirds(standings, qualContext);
    const { label, shortLabel } = buildLabel(candidate, teamsById);

    snapshots.push({
      id: candidate.id,
      type: candidate.type,
      matchId: candidate.match.id,
      minute: candidate.minute,
      label,
      shortLabel,
      group: candidate.match.group!,
      scoringTeamId: candidate.scoringTeamId,
      homeTeamId: candidate.match.homeTeamId,
      awayTeamId: candidate.match.awayTeamId,
      homeScore: candidate.homeScore,
      awayScore: candidate.awayScore,
      rankings,
      deltas: computeDeltas(previousRankings, rankings),
    });

    previousRankings = rankings;
  }

  const presentRankings = rankAliveBestThirds(presentStandings, presentQualContext);
  snapshots.push({
    id: "present",
    type: "present",
    matchId: "",
    minute: FINAL_MINUTE,
    label: "Live — current standings",
    shortLabel: "Now",
    group: "A",
    homeTeamId: "",
    awayTeamId: "",
    homeScore: 0,
    awayScore: 0,
    rankings: presentRankings,
    deltas: computeDeltas(previousRankings, presentRankings),
  });

  return snapshots;
}
