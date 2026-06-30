import { resolveCanonicalTeamId } from "../data/wc2026TeamCatalog";
import type { MergedMatch, PenaltyShootout, Team } from "../types";

export function isKnockoutMatch(
  match: Pick<MergedMatch, "matchId" | "id" | "group" | "stage">
): boolean {
  if (match.group) return false;
  const matchId = match.matchId ?? match.id ?? "";
  const num = Number(matchId.replace(/^M/, ""));
  if (Number.isFinite(num) && num >= 73) return true;
  return Boolean(match.stage);
}

/** Winner of a completed knockout match (regulation, extra time, or penalties). */
export function resolveMatchWinner(
  match: MergedMatch,
  teams: Record<string, Team> = {},
  penaltyShootout?: PenaltyShootout
): string | undefined {
  if (match.status !== "completed") return undefined;
  if (!isKnockoutMatch(match)) return undefined;

  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  const shootout = penaltyShootout ?? match.penaltyShootout;

  if (home > away) {
    return resolveCanonicalTeamId(match.homeTeamId, teams[match.homeTeamId]);
  }
  if (away > home) {
    return resolveCanonicalTeamId(match.awayTeamId, teams[match.awayTeamId]);
  }

  if (shootout) {
    if (shootout.homeScore > shootout.awayScore) {
      return resolveCanonicalTeamId(match.homeTeamId, teams[match.homeTeamId]);
    }
    if (shootout.awayScore > shootout.homeScore) {
      return resolveCanonicalTeamId(match.awayTeamId, teams[match.awayTeamId]);
    }
  }

  return undefined;
}

export function isAdvancingTeam(
  match: MergedMatch,
  teamId: string,
  teams: Record<string, Team> = {},
  penaltyShootout?: PenaltyShootout
): boolean {
  const winner = resolveMatchWinner(match, teams, penaltyShootout);
  if (!winner) return false;
  return resolveCanonicalTeamId(teamId, teams[teamId]) === winner;
}
