import type { MergedMatch, SourceKind } from "../types";

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

export function reconcileScoreAndEvents(
  match: MergedMatch,
  goalCountFromEvents: number,
  scoreGoals: number
): void {
  if (goalCountFromEvents !== scoreGoals) {
    // Score is truth — events annotate only; caller logs mismatch
  }
}
