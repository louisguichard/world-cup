import { resolveMatchKickoffMs } from "../matchLifecycle";
import type { MergedMatch, Team } from "../../types";
import type { CanonicalMatchId, FixtureRegistry } from "./types";
import { isOfficialMatchId } from "./isOfficialMatchId";
import { resolveTeamRef } from "./teamRegistry";

const KICKOFF_TOLERANCE_MS = 30 * 60 * 1000;

function pairKey(homeId: string, awayId: string): string {
  return [homeId, awayId].sort().join("|");
}

function kickoffMatchesFixture(
  kickoffMs: number,
  fixture: { kickoffMs: number }
): boolean {
  return Math.abs(fixture.kickoffMs - kickoffMs) <= KICKOFF_TOLERANCE_MS;
}

function resolveByKickoffOnly(
  kickoffMs: number,
  registry: FixtureRegistry
): CanonicalMatchId | null {
  const candidates = [...registry.byMatchId.values()].filter((fixture) =>
    kickoffMatchesFixture(kickoffMs, fixture)
  );

  if (candidates.length === 1) return candidates[0]!.canonicalId;
  return null;
}

function espnEventIdFromMatch(match: Pick<MergedMatch, "id" | "espnEventId">): string | undefined {
  if (match.espnEventId) return match.espnEventId;
  if (match.id && /^\d+$/.test(match.id)) return match.id;
  return undefined;
}

function resolveOfficialIdIfValid(
  id: string | undefined,
  kickoffMs: number | null | undefined,
  registry: FixtureRegistry
): CanonicalMatchId | null {
  if (!id || !isOfficialMatchId(id)) return null;
  const fixture = registry.byMatchId.get(id);
  if (!fixture) return null;
  if (
    kickoffMs != null &&
    Number.isFinite(kickoffMs) &&
    !kickoffMatchesFixture(kickoffMs, fixture)
  ) {
    return null;
  }
  return id;
}

function resolveByPairAndKickoff(
  homeCanon: string,
  awayCanon: string,
  kickoffMs: number,
  registry: FixtureRegistry
): CanonicalMatchId | null {
  if (!homeCanon || !awayCanon) return null;

  const candidates = registry.byPair.get(pairKey(homeCanon, awayCanon));
  if (!candidates?.length) return null;

  const inWindow = candidates.filter(
    (f) => Math.abs(f.kickoffMs - kickoffMs) <= KICKOFF_TOLERANCE_MS
  );

  if (inWindow.length === 1) return inWindow[0]!.canonicalId;
  if (inWindow.length > 1) {
    inWindow.sort(
      (a, b) => Math.abs(a.kickoffMs - kickoffMs) - Math.abs(b.kickoffMs - kickoffMs)
    );
    const best = inWindow[0]!;
    const second = inWindow[1];
    if (
      second &&
      Math.abs(best.kickoffMs - kickoffMs) === Math.abs(second.kickoffMs - kickoffMs)
    ) {
      return null;
    }
    return best.canonicalId;
  }

  if (candidates.length === 1) return candidates[0]!.canonicalId;
  return null;
}

/** Resolve a live/store row to official M## when possible (never venue-only). */
export function resolveFixtureRef(
  match: MergedMatch,
  teams: Record<string, Team> = {},
  registry: FixtureRegistry
): CanonicalMatchId | null {
  const kickoffMs = match.kickoffMs ?? resolveMatchKickoffMs(match);
  const hasKickoff = kickoffMs != null && Number.isFinite(kickoffMs);

  for (const id of [match.matchId, match.id]) {
    const official = resolveOfficialIdIfValid(id, hasKickoff ? kickoffMs : null, registry);
    if (official) return official;
  }

  const espnId = espnEventIdFromMatch(match);
  if (espnId) {
    const byEspn = registry.byEspnEventId.get(espnId);
    if (byEspn) {
      const fixture = registry.byMatchId.get(byEspn);
      if (
        fixture &&
        (!hasKickoff || kickoffMatchesFixture(kickoffMs!, fixture))
      ) {
        return byEspn;
      }
    }
  }

  if (!hasKickoff) return null;

  const homeCanon = resolveTeamRef(match.homeTeamId, teams);
  const awayCanon = resolveTeamRef(match.awayTeamId, teams);
  const byPair = resolveByPairAndKickoff(homeCanon, awayCanon, kickoffMs!, registry);
  if (byPair) return byPair;

  return resolveByKickoffOnly(kickoffMs!, registry);
}

export function lookupLiveMatch(
  liveMatches: Record<string, MergedMatch>,
  canonicalMatchId: string
): MergedMatch | undefined {
  if (liveMatches[canonicalMatchId]) return liveMatches[canonicalMatchId];
  return Object.values(liveMatches).find(
    (m) => m.matchId === canonicalMatchId || m.id === canonicalMatchId
  );
}
