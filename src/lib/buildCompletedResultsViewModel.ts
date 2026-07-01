import { localDateKey, yesterdayDateKey } from "./localDate";
import { teamDisplayNameFromId } from "./matchTeamDisplay";
import { prepareLiveMatchStore } from "./liveMatchStorePipeline";
import { resolveTeamRef } from "./registry";
import {
  resolveDisplayMatch,
  type MaterializedMatchIndex,
} from "./resolveDisplayMatch";
import type { ResultsFilters, ResultsSort } from "./resultsView";
import type { MergedMatch, Team } from "../types";

export type BuildCompletedResultsOptions = {
  filters?: ResultsFilters;
  sort?: ResultsSort;
  materializedIndex?: MaterializedMatchIndex;
};

export type RecentResultsSectionLabels = {
  today: string;
  yesterday: string;
  earlierKnockout: string;
};

export type RecentResultsSection = {
  label: string;
  matches: MergedMatch[];
};

function totalGoals(match: MergedMatch): number {
  return (match.homeScore ?? 0) + (match.awayScore ?? 0);
}

function goalMargin(match: MergedMatch): number {
  return Math.abs((match.homeScore ?? 0) - (match.awayScore ?? 0));
}

export function compareCompletedResults(
  a: MergedMatch,
  b: MergedMatch,
  sort: ResultsSort
): number {
  switch (sort) {
    case "oldest":
      return Date.parse(a.date) - Date.parse(b.date);
    case "highest_scoring":
      return totalGoals(b) - totalGoals(a) || Date.parse(b.date) - Date.parse(a.date);
    case "biggest_win":
      return goalMargin(b) - goalMargin(a) || Date.parse(b.date) - Date.parse(a.date);
    case "recent":
    default:
      return Date.parse(b.date) - Date.parse(a.date);
  }
}

export function applyResultsFilters(
  matches: MergedMatch[],
  filters: ResultsFilters,
  teams: Record<string, Team> = {}
): MergedMatch[] {
  const q = filters.search.trim().toLowerCase();
  return matches
    .filter((match) => {
      if (filters.stage === "all") return true;
      if (filters.stage === "group") return Boolean(match.group);
      return match.stage === filters.stage;
    })
    .filter((match) => {
      if (filters.group === "all") return true;
      return match.group === filters.group;
    })
    .filter((match) => {
      if (!q) return true;
      const homeName = teamDisplayNameFromId(resolveTeamRef(match.homeTeamId, teams), teams);
      const awayName = teamDisplayNameFromId(resolveTeamRef(match.awayTeamId, teams), teams);
      return (
        homeName.toLowerCase().includes(q) ||
        awayName.toLowerCase().includes(q) ||
        match.homeTeamId.toLowerCase().includes(q) ||
        match.awayTeamId.toLowerCase().includes(q)
      );
    });
}

/** Stable id for list keys and cross-view comparison. */
export function matchResultStableId(match: MergedMatch): string {
  return match.matchId ?? match.id;
}

/**
 * Single canonical completed-results list — dedupe once, then filter to scored finals.
 */
export function listCanonicalCompletedMatches(
  liveMatches: Record<string, MergedMatch>,
  teams: Record<string, Team>
): MergedMatch[] {
  return Object.values(prepareLiveMatchStore(liveMatches, teams)).filter(
    (match) => match.status === "completed" && match.homeScore !== undefined
  );
}

/**
 * Unified results entry point for Live recent + Results tab.
 */
export function buildCompletedResultsViewModel(
  liveMatches: Record<string, MergedMatch>,
  teams: Record<string, Team>,
  options: BuildCompletedResultsOptions = {}
): MergedMatch[] {
  let matches = listCanonicalCompletedMatches(liveMatches, teams);

  if (options.filters) {
    matches = applyResultsFilters(matches, options.filters, teams);
  }

  const sort = options.sort ?? "recent";
  matches = [...matches].sort((a, b) => compareCompletedResults(a, b, sort));

  if (options.materializedIndex) {
    matches = matches.map((match) => resolveDisplayMatch(match, options.materializedIndex!));
  }

  return matches;
}

export function buildRecentResultsSections(
  completed: MergedMatch[],
  options: {
    maxTotal?: number;
    isKnockoutActive?: boolean;
    now?: Date;
    labels: RecentResultsSectionLabels;
  }
): { sections: RecentResultsSection[]; total: number } {
  const maxTotal = options.maxTotal ?? 8;
  const now = options.now ?? new Date();
  const todayKey = localDateKey(now);
  const yKey = yesterdayDateKey(now);
  const { labels, isKnockoutActive = false } = options;

  const todayMatches = completed.filter((m) => localDateKey(new Date(m.date)) === todayKey);
  const yesterdayMatches = completed.filter((m) => localDateKey(new Date(m.date)) === yKey);

  const sections: RecentResultsSection[] = [];
  let remaining = maxTotal;

  if (todayMatches.length > 0) {
    const slice = todayMatches.slice(0, remaining);
    sections.push({ label: `${labels.today} (${todayMatches.length})`, matches: slice });
    remaining -= slice.length;
  }
  if (remaining > 0 && yesterdayMatches.length > 0) {
    const slice = yesterdayMatches.slice(0, remaining);
    sections.push({ label: `${labels.yesterday} (${yesterdayMatches.length})`, matches: slice });
    remaining -= slice.length;
  }
  if (remaining > 0 && isKnockoutActive) {
    const earlierMatches = completed.filter((m) => {
      const key = localDateKey(new Date(m.date));
      return key !== todayKey && key !== yKey;
    });
    if (earlierMatches.length > 0) {
      sections.push({
        label: `${labels.earlierKnockout} (${earlierMatches.length})`,
        matches: earlierMatches.slice(0, remaining),
      });
    }
  }

  return { sections, total: completed.length };
}

export function filterCompletedResults(
  liveMatches: Record<string, MergedMatch>,
  filters: ResultsFilters,
  teams: Record<string, Team> = {}
): MergedMatch[] {
  return applyResultsFilters(listCanonicalCompletedMatches(liveMatches, teams), filters, teams);
}
