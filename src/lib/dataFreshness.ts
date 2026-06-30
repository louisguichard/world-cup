import type { GroupStanding, MergedMatch } from "../types";
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

function preservePenaltyFields(
  existing: Record<string, MergedMatch>,
  incoming: Record<string, MergedMatch>
): Record<string, MergedMatch> {
  const merged: Record<string, MergedMatch> = {};
  for (const id of Object.keys(incoming)) {
    const prev = existing[id];
    merged[id] = {
      ...incoming[id],
      penaltyShootout: incoming[id].penaltyShootout ?? prev?.penaltyShootout,
      decidedByPenalties: incoming[id].decidedByPenalties ?? prev?.decidedByPenalties,
    };
  }
  return merged;
}

export function mergeLiveMatchRecords(
  existing: Record<string, MergedMatch>,
  incoming: Record<string, MergedMatch>
): { merged: Record<string, MergedMatch>; changed: boolean } {
  const existingIds = Object.keys(existing);
  const incomingIds = Object.keys(incoming);

  if (existingIds.length !== incomingIds.length) {
    return { merged: preservePenaltyFields(existing, incoming), changed: true };
  }

  for (const id of incomingIds) {
    const prev = existing[id];
    const next = incoming[id];
    if (!prev || !snapshotEqual(matchLiveSnapshot(prev), matchLiveSnapshot(next))) {
      return { merged: preservePenaltyFields(existing, incoming), changed: true };
    }
  }

  return { merged: existing, changed: false };
}

export function standingsChanged(a: GroupStanding[], b: GroupStanding[]): boolean {
  return !standingsEqual(a, b);
}
