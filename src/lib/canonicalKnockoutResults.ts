import canonicalJson from "../data/canonicalKnockoutResults.json";
import { getBroadcast } from "../services/BroadcastLookup";
import { buildFixtureRegistry } from "./registry/buildFixtureRegistry";
import type { MergedMatch, PenaltyShootout, Stage } from "../types";

type CanonicalRow = {
  espnEventId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  penaltyShootout?: Pick<PenaltyShootout, "homeScore" | "awayScore">;
  decidedByPenalties?: boolean;
  stage?: Stage;
};

const registry = buildFixtureRegistry();

/** Locked official R32 results — single runtime truth for completed feeders M73–M78. */
export function getCanonicalLockedKnockoutMatches(): Record<string, MergedMatch> {
  const out: Record<string, MergedMatch> = {};

  for (const [matchId, row] of Object.entries(canonicalJson.matches as Record<string, CanonicalRow>)) {
    const fixture = registry.byMatchId.get(matchId);
    out[matchId] = {
      id: matchId,
      matchId,
      espnEventId: row.espnEventId,
      date:
        getBroadcast(matchId)?.kickoffUTC ??
        (fixture?.kickoffMs ? new Date(fixture.kickoffMs).toISOString() : undefined) ??
        "",
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      penaltyShootout: row.penaltyShootout
        ? {
            home: [],
            away: [],
            homeScore: row.penaltyShootout.homeScore,
            awayScore: row.penaltyShootout.awayScore,
          }
        : undefined,
      decidedByPenalties: row.decidedByPenalties,
      status: "completed",
      locked: true,
      source: "espn",
      stage: row.stage ?? fixture?.stage ?? "R32",
      venue: fixture?.venue,
      homeConduct: 0,
      awayConduct: 0,
    };
  }

  return out;
}

/** Overlay locked canonical knockout rows. When force is true, official rows replace any cache row. */
export function mergeCanonicalLockedKnockout(
  store: Record<string, MergedMatch>,
  options: { force?: boolean } = {}
): Record<string, MergedMatch> {
  const canonical = getCanonicalLockedKnockoutMatches();
  if (Object.keys(canonical).length === 0) return store;

  const out = { ...store };
  for (const [matchId, row] of Object.entries(canonical)) {
    const existing =
      out[matchId] ??
      Object.values(out).find((m) => m.matchId === matchId || m.id === matchId);
    if (!options.force && existing?.locked && existing.status === "completed") continue;
    out[matchId] = row;
  }
  return out;
}
