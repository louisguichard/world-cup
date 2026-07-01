import type { MergedMatch, SourceKind } from "../types";
import { coerceLiveStatusForKickoff } from "../lib/matchLifecycle";
import { isResultFinalLocked, sanitizeLegacyLockedFlag } from "../lib/liveDataContract";

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

function resolveKickoffMs(
  incoming: Partial<MergedMatch>,
  existing?: MergedMatch
): number | undefined {
  if (incoming.kickoffMs != null && !Number.isNaN(incoming.kickoffMs)) return incoming.kickoffMs;
  const dateIso = incoming.date ?? existing?.date;
  if (!dateIso) return existing?.kickoffMs;
  const parsed = Date.parse(dateIso);
  return Number.isNaN(parsed) ? existing?.kickoffMs : parsed;
}

function stripUntrustedLivePromotion(
  incoming: Partial<MergedMatch>,
  source: SourceKind
): Partial<MergedMatch> {
  if (incoming.status !== "live") return incoming;
  if (source === "espn" || source === "manual") return incoming;
  const { status: _status, ...rest } = incoming;
  return rest;
}

function resolveLockedField(
  incoming: Partial<MergedMatch>,
  existing?: MergedMatch
): boolean {
  if (incoming.status === "completed") {
    return incoming.locked ?? true;
  }
  if (incoming.status === "live") {
    return false;
  }
  return incoming.locked ?? existing?.locked ?? false;
}

function finalizeMergedMatch(
  existing: MergedMatch | undefined,
  incoming: Partial<MergedMatch>,
  source: SourceKind,
  kickoffMs: number | undefined
): MergedMatch {
  const locked = resolveLockedField(incoming, existing);
  const merged = {
    ...(existing ?? {
      id: incoming.id ?? "",
      date: incoming.date ?? new Date().toISOString(),
      homeTeamId: incoming.homeTeamId ?? "",
      awayTeamId: incoming.awayTeamId ?? "",
      status: incoming.status ?? "scheduled",
      homeConduct: incoming.homeConduct ?? 0,
      awayConduct: incoming.awayConduct ?? 0,
      locked: false,
      source,
      dataSource: source,
    }),
    ...incoming,
    locked,
    kickoffMs,
    source:
      source === "manual"
        ? "manual"
        : existing?.source === "manual"
          ? "manual"
          : source,
    dataSource: source,
    lastUpdatedAt: Date.now(),
  } as MergedMatch;

  return coerceLiveStatusForKickoff(sanitizeLegacyLockedFlag(merged as MergedMatch));
}

export function applyLiveScore(
  existing: MergedMatch | undefined,
  incoming: Partial<MergedMatch>,
  source: SourceKind
): MergedMatch {
  const kickoffMs = resolveKickoffMs(incoming, existing);
  const patch = stripUntrustedLivePromotion(incoming, source);

  if (!existing) {
    return finalizeMergedMatch(undefined, patch, source, kickoffMs);
  }

  if (existing.source === "manual" && source !== "manual") {
    return existing;
  }

  if (isResultFinalLocked(existing) && source !== "manual") {
    return existing;
  }

  const existingRank = PRECEDENCE[existing.dataSource ?? existing.source] ?? 0;
  const incomingRank = PRECEDENCE[source] ?? 0;

  if (incomingRank < existingRank) {
    return existing;
  }

  return finalizeMergedMatch(existing, patch, source, kickoffMs);
}

/** Score-only patch from secondary feeds — never lifecycle fields. */
export function applySecondaryScorePatch(
  existing: MergedMatch,
  patch: { homeScore: number; awayScore: number }
): MergedMatch {
  if (isResultFinalLocked(existing) || existing.source === "manual") {
    return existing;
  }
  return sanitizeLegacyLockedFlag({
    ...existing,
    homeScore: patch.homeScore,
    awayScore: patch.awayScore,
    lastUpdatedAt: Date.now(),
  });
}

/** Secondary SofaScore enrichment — never overwrites result-final/manual matches. */
export function enrichFromSofaScore(
  existing: MergedMatch,
  patch: SofaEnrichmentPatch
): MergedMatch {
  if (isResultFinalLocked(existing) || existing.source === "manual") {
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

  // Secondary sources never own lifecycle — only ESPN promotes to live.
  if (patch.status !== "live" && patch.status) {
    updates.status = patch.status;
  }

  return coerceLiveStatusForKickoff({
    ...existing,
    ...updates,
    locked: existing.locked,
    source: existing.source,
    dataSource: existing.dataSource ?? existing.source,
  } as MergedMatch);
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
