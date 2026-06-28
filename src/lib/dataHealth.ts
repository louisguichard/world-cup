import { readStandingsCache } from "./standingsCache";
import { readLiveMatchCache } from "./liveMatchCache";
import { BOOT_TEAMS_CACHE_KEY } from "./bootCache";
import { standingsHasLiveStats, standingsStatScore } from "../services/adapters/normalizeStandings";
import { resolveTeamFromStore } from "../data/wc2026TeamCatalog";
import type { GroupStanding, MergedMatch, Team } from "../types";

export type DataHealthIssue = {
  severity: "error" | "warn" | "info";
  code: string;
  message: string;
};

export type DataHealthReport = {
  checkedAt: string;
  teams: {
    total: number;
    catalogIds: number;
    numericOnlyKeys: number;
    unresolvedMatchTeamRefs: number;
  };
  standings: {
    groups: number;
    statScore: number;
    hasLiveStats: boolean;
    cacheGroups: number;
    cacheStatScore: number;
  };
  matches: {
    total: number;
    linkedToSchedule: number;
    numericTeamLabels: number;
  };
  issues: DataHealthIssue[];
};

function isNumericTeamId(id: string): boolean {
  return /^\d+$/.test(id);
}

function countCatalogTeamKeys(teams: Record<string, Team>): number {
  return Object.keys(teams).filter((id) => !isNumericTeamId(id) && id.length <= 3).length;
}

function countNumericOnlyKeys(teams: Record<string, Team>): number {
  return Object.keys(teams).filter((id) => isNumericTeamId(id)).length;
}

function countUnresolvedMatchTeams(
  matches: Record<string, MergedMatch>,
  teams: Record<string, Team>
): number {
  let count = 0;
  for (const match of Object.values(matches)) {
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      const resolved = resolveTeamFromStore(teams, teamId);
      if (!resolved?.name || resolved.name === teamId) count += 1;
    }
  }
  return count;
}

function countNumericTeamLabels(
  matches: Record<string, MergedMatch>,
  teams: Record<string, Team>
): number {
  let count = 0;
  for (const match of Object.values(matches)) {
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      const resolved = resolveTeamFromStore(teams, teamId);
      const label = resolved?.name ?? teamId;
      if (label === teamId && isNumericTeamId(teamId)) count += 1;
    }
  }
  return count;
}

function readCacheSavedAt(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: string };
    return parsed.savedAt ?? null;
  } catch {
    return null;
  }
}

export function buildDataHealthReport(input: {
  teams: Record<string, Team>;
  groupStandings: GroupStanding[];
  liveMatches: Record<string, MergedMatch>;
  dataWarnings?: string[];
}): DataHealthReport {
  const { teams, groupStandings, liveMatches, dataWarnings = [] } = input;
  const issues: DataHealthIssue[] = [];
  const matchList = Object.values(liveMatches);
  const cacheStandings = readStandingsCache() ?? [];

  const numericOnlyKeys = countNumericOnlyKeys(teams);
  const unresolvedMatchTeamRefs = countUnresolvedMatchTeams(liveMatches, teams);
  const numericTeamLabels = countNumericTeamLabels(liveMatches, teams);
  const linkedToSchedule = matchList.filter((m) => Boolean(m.matchId)).length;
  const statScore = standingsStatScore(groupStandings);
  const cacheStatScore = standingsStatScore(cacheStandings);
  const hasLiveStats = standingsHasLiveStats(groupStandings);

  if (numericTeamLabels > 0) {
    issues.push({
      severity: "error",
      code: "numeric-team-labels",
      message: `${numericTeamLabels} match side(s) still show raw ESPN ids — team alias map may be missing.`,
    });
  }

  if (unresolvedMatchTeamRefs > 0) {
    issues.push({
      severity: "warn",
      code: "unresolved-team-refs",
      message: `${unresolvedMatchTeamRefs} match team reference(s) could not resolve to a country name.`,
    });
  }

  if (groupStandings.length === 0) {
    issues.push({
      severity: "warn",
      code: "standings-empty",
      message: "Group standings are empty in memory.",
    });
  } else if (!hasLiveStats && cacheStatScore > statScore) {
    issues.push({
      severity: "warn",
      code: "standings-downgraded",
      message: `In-memory standings (${statScore} pts) are below cache (${cacheStatScore} pts) — a wipe may have been blocked or deferred.`,
    });
  }

  if (numericOnlyKeys > 0 && countCatalogTeamKeys(teams) < 48) {
    issues.push({
      severity: "warn",
      code: "teams-not-merged",
      message: `${numericOnlyKeys} ESPN-only team keys — run catalog merge to restore country names.`,
    });
  }

  if (linkedToSchedule < matchList.length * 0.5 && matchList.length > 0) {
    issues.push({
      severity: "info",
      code: "schedule-link-low",
      message: `Only ${linkedToSchedule}/${matchList.length} matches linked to official schedule — kickoff dates may be ESPN-only.`,
    });
  }

  for (const warning of dataWarnings.slice(-5)) {
    issues.push({
      severity: "warn",
      code: "data-guard",
      message: warning,
    });
  }

  const teamsSavedAt = readCacheSavedAt(BOOT_TEAMS_CACHE_KEY);
  if (teamsSavedAt) {
    issues.push({
      severity: "info",
      code: "cache-teams",
      message: `Teams cache saved ${teamsSavedAt}`,
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    teams: {
      total: Object.keys(teams).length,
      catalogIds: countCatalogTeamKeys(teams),
      numericOnlyKeys,
      unresolvedMatchTeamRefs,
    },
    standings: {
      groups: groupStandings.length,
      statScore,
      hasLiveStats,
      cacheGroups: cacheStandings.length,
      cacheStatScore,
    },
    matches: {
      total: matchList.length,
      linkedToSchedule,
      numericTeamLabels,
    },
    issues,
  };
}
