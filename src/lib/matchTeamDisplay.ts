import {
  resolveTeamForDisplay,
  resolveCanonicalTeamId,
  mergeTeamWithCatalog,
} from "../data/wc2026TeamCatalog";
import { getScheduleTeamName } from "../services/BroadcastLookup";
import type { MergedMatch, Team } from "../types";
import { isInternalTeamId, teamDisplayName, teamLiveCardName } from "./teamIdentity";

export type MatchSide = "home" | "away";

function sideTeamId(match: Pick<MergedMatch, "homeTeamId" | "awayTeamId">, side: MatchSide): string {
  return side === "home" ? match.homeTeamId : match.awayTeamId;
}

export { isInternalTeamId };

/** Resolve a team from the store by direct id, canonical id, or catalog fallback. */
export function resolveTeamFromStore(
  teamId: string | undefined,
  teams: Record<string, Team>
): Team | undefined {
  if (!teamId?.trim()) return undefined;

  const direct = teams[teamId];
  if (direct) return mergeTeamWithCatalog(direct);

  const canonical = resolveCanonicalTeamId(teamId);
  const byCanonical = teams[canonical];
  if (byCanonical) return mergeTeamWithCatalog(byCanonical);

  for (const candidate of Object.values(teams)) {
    if (candidate.id === teamId) return mergeTeamWithCatalog(candidate);
    if (resolveCanonicalTeamId(candidate.id, candidate) === canonical) {
      return mergeTeamWithCatalog(candidate);
    }
  }

  return resolveTeamForDisplay(teamId);
}

export function scheduleNameHintForMatch(
  match: Pick<MergedMatch, "matchId" | "id">,
  side: MatchSide
): string | undefined {
  const matchId = match.matchId ?? match.id;
  return matchId ? getScheduleTeamName(matchId, side) : undefined;
}

export function resolveMatchTeam(
  match: Pick<MergedMatch, "homeTeamId" | "awayTeamId" | "matchId" | "id">,
  side: MatchSide,
  teams: Record<string, Team>
): Team | undefined {
  const teamId = sideTeamId(match, side);
  return resolveTeamFromStore(teamId, teams);
}

export function teamDisplayNameForMatch(
  match: Pick<MergedMatch, "homeTeamId" | "awayTeamId" | "matchId" | "id">,
  side: MatchSide,
  teams: Record<string, Team>
): string {
  const teamId = sideTeamId(match, side);
  const scheduleHint = scheduleNameHintForMatch(match, side);
  const team = resolveTeamFromStore(teamId, teams);
  return teamDisplayName(team, teamId || scheduleHint || "TBD", scheduleHint);
}

export function teamLiveCardNameForMatch(
  match: Pick<MergedMatch, "homeTeamId" | "awayTeamId" | "matchId" | "id">,
  side: MatchSide,
  teams: Record<string, Team>
): string {
  const teamId = sideTeamId(match, side);
  const scheduleHint = scheduleNameHintForMatch(match, side);
  const team = resolveTeamFromStore(teamId, teams);
  return teamLiveCardName(team, teamId || scheduleHint || "TBD", scheduleHint);
}

/** User-visible label from a team id and optional store. */
export function teamDisplayNameFromId(
  teamId: string,
  teams: Record<string, Team>,
  nameHint?: string
): string {
  return teamDisplayName(resolveTeamFromStore(teamId, teams), teamId, nameHint);
}

/** Flag / theme id — prefers catalog id, never exposes ESPN numeric ids in UI chrome. */
export function flagTeamIdForMatch(
  match: Pick<MergedMatch, "homeTeamId" | "awayTeamId" | "matchId" | "id">,
  side: MatchSide,
  teams: Record<string, Team>
): string {
  const team = resolveMatchTeam(match, side, teams);
  if (team?.id) return team.id;
  const scheduleHint = scheduleNameHintForMatch(match, side);
  const fromHint = scheduleHint ? resolveTeamForDisplay(scheduleHint) : undefined;
  return fromHint?.id ?? sideTeamId(match, side) ?? scheduleHint ?? "tbd";
}
