import type { MergedMatch, SourceKind } from "../types";

export type SofaEnrichmentPatch = Pick<
  Partial<MergedMatch>,
  | "clockMinute"
  | "clockExtra"
  | "clockRunning"
  | "displayClock"
  | "period"
  | "homeScore"
  | "awayScore"
  | "status"
  | "sofaEventId"
>;

const PRECEDENCE: Record<SourceKind, number> = {
  manual: 4,
  sofascore: 3,
  espn: 2,
  polymarket: 1,
  model: 0
};

export function applyLiveScore(
  existing: MergedMatch | undefined,
  incoming: Partial<MergedMatch>,
  source: SourceKind
): MergedMatch {
  if (!existing) {
    return {
      id: incoming.id ?? "",
      date: incoming.date ?? new Date().toISOString(),
      homeTeamId: incoming.homeTeamId ?? "",
      awayTeamId: incoming.awayTeamId ?? "",
      status: incoming.status ?? "scheduled",
      homeConduct: incoming.homeConduct ?? 0,
      awayConduct: incoming.awayConduct ?? 0,
      locked: incoming.locked ?? false,
      source,
      dataSource: source,
      ...incoming
    } as MergedMatch;
  }

  if (existing.source === "manual" && source !== "manual") {
    return existing;
  }

  const existingRank = PRECEDENCE[existing.dataSource ?? existing.source] ?? 0;
  const incomingRank = PRECEDENCE[source] ?? 0;

  if (incomingRank < existingRank) {
    return existing;
  }

  return {
    ...existing,
    ...incoming,
    source: source === "manual" ? "manual" : existing.source === "manual" ? "manual" : source,
    dataSource: source,
    lastUpdatedAt: Date.now()
  };
}

/** Secondary SofaScore enrichment — never overwrites locked/completed/manual ESPN matches. */
export function enrichFromSofaScore(
  existing: MergedMatch,
  patch: SofaEnrichmentPatch
): MergedMatch {
  if (existing.locked || existing.status === "completed" || existing.source === "manual") {
    return existing;
  }

  const updates: Partial<MergedMatch> = {
    sofaEventId: patch.sofaEventId ?? existing.sofaEventId,
    sofaLinkedAt: Date.now()
  };

  if (patch.clockMinute !== undefined) updates.clockMinute = patch.clockMinute;
  if (patch.clockExtra !== undefined) updates.clockExtra = patch.clockExtra;
  if (patch.clockRunning !== undefined) updates.clockRunning = patch.clockRunning;
  if (patch.displayClock !== undefined) updates.displayClock = patch.displayClock;
  if (patch.period !== undefined) updates.period = patch.period;
  if (patch.homeScore !== undefined) updates.homeScore = patch.homeScore;
  if (patch.awayScore !== undefined) updates.awayScore = patch.awayScore;

  if (patch.status) {
    updates.status = patch.status;
  }

  return {
    ...existing,
    ...updates,
    locked: existing.locked,
    source: existing.source,
    dataSource: existing.dataSource ?? existing.source
  };
}

export function reconcileScoreAndEvents(
  match: MergedMatch,
  goalCountFromEvents: number,
  scoreGoals: number
): void {
  if (goalCountFromEvents !== scoreGoals) {
    // Score is truth — events annotate only; caller logs mismatch
  }
}
