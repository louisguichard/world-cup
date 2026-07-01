import type { GroupStanding, MergedMatch } from "../types";
import { isResultFinalLocked } from "./liveDataContract";
import { standingsEqual } from "./qualification";

export type MatchLiveSnapshot = Pick<
  MergedMatch,
  | "status"
  | "homeScore"
  | "awayScore"
  | "clockMinute"
  | "clockExtra"
  | "clockRunning"
  | "displayClock"
  | "period"
  | "lastUpdatedAt"
  | "locked"
  | "matchId"
  | "date"
  | "homeTeamId"
  | "awayTeamId"
>;

export function matchLiveSnapshot(m: MergedMatch): MatchLiveSnapshot {
  return {
    status: m.status,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    clockMinute: m.clockMinute,
    clockExtra: m.clockExtra,
    clockRunning: m.clockRunning,
    displayClock: m.displayClock,
    period: m.period,
    lastUpdatedAt: m.lastUpdatedAt,
    locked: m.locked,
    matchId: m.matchId,
    date: m.date,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
  };
}

function snapshotEqual(a: MatchLiveSnapshot, b: MatchLiveSnapshot): boolean {
  return (
    a.status === b.status &&
    a.homeScore === b.homeScore &&
    a.awayScore === b.awayScore &&
    a.clockMinute === b.clockMinute &&
    a.clockExtra === b.clockExtra &&
    a.clockRunning === b.clockRunning &&
    a.displayClock === b.displayClock &&
    a.period === b.period &&
    a.lastUpdatedAt === b.lastUpdatedAt &&
    a.locked === b.locked &&
    a.matchId === b.matchId &&
    a.date === b.date &&
    a.homeTeamId === b.homeTeamId &&
    a.awayTeamId === b.awayTeamId
  );
}

function mergePenaltyFields(
  existing: MergedMatch | undefined,
  incoming: MergedMatch
): MergedMatch {
  return {
    ...incoming,
    penaltyShootout: incoming.penaltyShootout ?? existing?.penaltyShootout,
    decidedByPenalties: incoming.decidedByPenalties ?? existing?.decidedByPenalties,
  };
}

function mergeLiveRow(
  existing: MergedMatch | undefined,
  incoming: MergedMatch
): MergedMatch {
  if (existing && isResultFinalLocked(existing) && !isResultFinalLocked(incoming)) {
    return mergePenaltyFields(existing, {
      ...existing,
      lastUpdatedAt: incoming.lastUpdatedAt ?? existing.lastUpdatedAt,
    });
  }

  return mergePenaltyFields(existing, incoming);
}

export function mergeLiveMatchRecords(
  existing: Record<string, MergedMatch>,
  incoming: Record<string, MergedMatch>
): { merged: Record<string, MergedMatch>; changed: boolean } {
  const merged: Record<string, MergedMatch> = {};
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
  let changed = false;

  for (const id of allKeys) {
    const prev = existing[id];
    const next = incoming[id];

    if (!next) {
      if (prev && isResultFinalLocked(prev)) {
        merged[id] = prev;
        continue;
      }
      if (prev) changed = true;
      continue;
    }

    const row = mergeLiveRow(prev, next);
    merged[id] = row;

    if (!prev || !snapshotEqual(matchLiveSnapshot(prev), matchLiveSnapshot(row))) {
      changed = true;
    }
  }

  if (!changed) {
    return { merged: existing, changed: false };
  }

  return { merged, changed: true };
}

export function standingsChanged(a: GroupStanding[], b: GroupStanding[]): boolean {
  return !standingsEqual(a, b);
}
