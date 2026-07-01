import { lookupBracketLiveMatch } from "../bracketTree";
import { resolveCanonicalTeamId } from "../../data/wc2026TeamCatalog";
import { resolveMatchWinner } from "../resolveMatchWinner";
import {
  collectFeederAncestors,
  collectForwardPathFromMatch,
} from "./bracketPathHighlight";
import type { BracketMatch, MergedMatch, Stage, Team } from "../../types";

export function teamAppearsInBracketMatch(teamId: string, match: BracketMatch): boolean {
  const canonical = resolveCanonicalTeamId(teamId);
  if (match.homeTeamId === canonical || match.awayTeamId === canonical) return true;
  if (match.homeGhosts?.some((ghost) => ghost.teamId === canonical)) return true;
  if (match.awayGhosts?.some((ghost) => ghost.teamId === canonical)) return true;
  return false;
}

export function findTeamBracketAnchorMatches(teamId: string, bracket: BracketMatch[]): BracketMatch[] {
  return bracket.filter((match) => teamAppearsInBracketMatch(teamId, match));
}

function isTeamEliminatedAtMatch(
  teamId: string,
  match: BracketMatch,
  liveMatches: Record<string, MergedMatch>,
  teamsById: Record<string, Team>
): boolean {
  const live = lookupBracketLiveMatch(liveMatches, match.id);
  if (!live?.locked || live.status !== "completed") return false;

  const winner = resolveMatchWinner(live, teamsById);
  if (!winner) return false;

  const canonical = resolveCanonicalTeamId(teamId, teamsById[teamId]);
  return winner !== canonical;
}

const STAGE_ORDER: Record<Stage, number> = {
  R32: 0,
  R16: 1,
  QF: 2,
  SF: 3,
  ThirdPlace: 4,
  Final: 5,
};

/** Upstream feeders plus forward route while the team is still alive in the bracket graph. */
export function collectBracketPathForTeam(
  teamId: string,
  bracket: BracketMatch[],
  liveMatches: Record<string, MergedMatch>,
  teamsById: Record<string, Team>
): Set<string> {
  const anchors = findTeamBracketAnchorMatches(teamId, bracket);
  const path = new Set<string>();

  for (const match of anchors) {
    for (const id of collectFeederAncestors(match.id)) {
      path.add(id);
    }
    path.add(match.id);
  }

  if (anchors.length === 0) return path;

  const primaryAnchor = [...anchors].sort(
    (a, b) => STAGE_ORDER[b.stage] - STAGE_ORDER[a.stage]
  )[0];

  if (
    primaryAnchor &&
    !isTeamEliminatedAtMatch(teamId, primaryAnchor, liveMatches, teamsById)
  ) {
    for (const id of collectForwardPathFromMatch(primaryAnchor.id)) {
      path.add(id);
    }
  }

  return path;
}

export function listTeamsInBracketProjection(
  bracket: BracketMatch[],
  teamsById: Record<string, Team>
): string[] {
  const ids = new Set<string>();

  for (const match of bracket) {
    if (match.homeTeamId) ids.add(match.homeTeamId);
    if (match.awayTeamId) ids.add(match.awayTeamId);
    for (const ghost of match.homeGhosts ?? []) ids.add(ghost.teamId);
    for (const ghost of match.awayGhosts ?? []) ids.add(ghost.teamId);
  }

  return [...ids]
    .filter((id) => teamsById[id])
    .sort((a, b) => {
      const nameA = teamsById[a]?.name ?? a;
      const nameB = teamsById[b]?.name ?? b;
      return nameA.localeCompare(nameB);
    });
}

export function resolveFollowedTeamFocusStage(
  teamId: string,
  stages: readonly Stage[],
  orderedByStage: Record<Stage, BracketMatch[]>
): Stage | null {
  let focus: import("../../types").Stage | null = null;

  for (const stage of stages) {
    if (orderedByStage[stage].some((match) => teamAppearsInBracketMatch(teamId, match))) {
      focus = stage;
    }
  }

  return focus;
}
