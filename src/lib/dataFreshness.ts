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
    a.locked === b.locked
  );
}

export function mergeLiveMatchRecords(
  existing: Record<string, MergedMatch>,
  incoming: Record<string, MergedMatch>
): { merged: Record<string, MergedMatch>; changed: boolean } {
  const existingIds = Object.keys(existing);
  const incomingIds = Object.keys(incoming);

  if (existingIds.length !== incomingIds.length) {
    return { merged: incoming, changed: true };
  }

  for (const id of incomingIds) {
    const prev = existing[id];
    const next = incoming[id];
    if (!prev || !snapshotEqual(matchLiveSnapshot(prev), matchLiveSnapshot(next))) {
      return { merged: incoming, changed: true };
    }
  }

  return { merged: existing, changed: false };
}

export function standingsChanged(a: GroupStanding[], b: GroupStanding[]): boolean {
  return !standingsEqual(a, b);
}
