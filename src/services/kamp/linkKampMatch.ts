import type { MatchEvent, MergedMatch, Team } from "../../types";
import { resolveTeamAbbrevFromHint, resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import type { KampMatchRecord } from "../../schemas/kampMatches";
import { kampMatchKey } from "./KampMatchesClient";

function sameCalendarDay(utcIso: string, ymd: string): boolean {
  const d = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return local === ymd;
}

function matchAbbrevs(
  storeMatch: MergedMatch,
  teams: Record<string, Team>
): { home: string; away: string } | null {
  const homeTeam = resolveTeamFromStore(teams, storeMatch.homeTeamId);
  const awayTeam = resolveTeamFromStore(teams, storeMatch.awayTeamId);
  const home =
    resolveTeamAbbrevFromHint(homeTeam?.abbreviation) ??
    resolveTeamAbbrevFromHint(homeTeam?.name) ??
    resolveTeamAbbrevFromHint(storeMatch.homeTeamId);
  const away =
    resolveTeamAbbrevFromHint(awayTeam?.abbreviation) ??
    resolveTeamAbbrevFromHint(awayTeam?.name) ??
    resolveTeamAbbrevFromHint(storeMatch.awayTeamId);
  if (!home || !away) return null;
  return { home, away };
}

function scoresMatch(
  storeMatch: MergedMatch,
  kamp: KampMatchRecord
): boolean {
  if (
    kamp.score_1 === undefined ||
    kamp.score_2 === undefined ||
    storeMatch.homeScore === undefined ||
    storeMatch.awayScore === undefined
  ) {
    return true;
  }
  return kamp.score_1 === storeMatch.homeScore && kamp.score_2 === storeMatch.awayScore;
}

export type KampLinkResult = {
  storeMatchId: string;
  kamp: KampMatchRecord;
};

/** Link a kamp record to a store match by PT team names, date, and optional score. */
export function linkKampMatchToStore(
  kamp: KampMatchRecord,
  merged: Record<string, MergedMatch>,
  teams: Record<string, Team>
): KampLinkResult | null {
  const homeAbbrev = resolveTeamAbbrevFromHint(kamp.team_1);
  const awayAbbrev = resolveTeamAbbrevFromHint(kamp.team_2);
  if (!homeAbbrev || !awayAbbrev) return null;

  const candidates = Object.values(merged).filter((m) => {
    const abbrevs = matchAbbrevs(m, teams);
    if (!abbrevs) return false;
    if (abbrevs.home !== homeAbbrev || abbrevs.away !== awayAbbrev) return false;
    if (!sameCalendarDay(m.date, kamp.date)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aScore = scoresMatch(a, kamp) ? 1 : 0;
    const bScore = scoresMatch(b, kamp) ? 1 : 0;
    if (bScore !== aScore) return bScore - aScore;
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    return bDone - aDone;
  });

  const best = candidates[0];
  if (!best) return null;
  if (!scoresMatch(best, kamp) && best.status === "completed") return null;

  return { storeMatchId: best.id, kamp };
}

/** Find kamp record for an existing store match. */
export function findKampRecordForMatch(
  match: MergedMatch,
  index: Map<string, KampMatchRecord>,
  teams: Record<string, Team>
): KampMatchRecord | null {
  const abbrevs = matchAbbrevs(match, teams);
  if (!abbrevs) return null;

  const ymd = match.date.slice(0, 10);
  const direct = index.get(kampMatchKey(ymd, abbrevs.home, abbrevs.away));
  if (direct) return direct;

  for (const kamp of index.values()) {
    if (kamp.date !== ymd) continue;
    const linked = linkKampMatchToStore(kamp, { [match.id]: match }, teams);
    if (linked?.storeMatchId === match.id) return kamp;
  }

  return null;
}
