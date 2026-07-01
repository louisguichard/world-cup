import { localDateKey } from "./localDate";
import type { GroupLetter, MergedMatch, Stage, Team } from "../types";
import { groupLockedResults, type ResultsSection } from "./resultsGrouping";
import {
  compareCompletedResults,
  filterCompletedResults,
} from "./buildCompletedResultsViewModel";

export type ResultsSort = "recent" | "oldest" | "highest_scoring" | "biggest_win";

export type ResultsFilters = {
  sort: ResultsSort;
  stage: "all" | "group" | Stage;
  group: "all" | GroupLetter;
  search: string;
};

export type ResultsDaySection = {
  label: string;
  dateKey: string;
  isToday: boolean;
  matches: MergedMatch[];
};

export { compareCompletedResults, filterCompletedResults } from "./buildCompletedResultsViewModel";

export function groupResultsByDay(matches: MergedMatch[], sort: ResultsSort): ResultsDaySection[] {
  const now = new Date();
  const todayKey = localDateKey(now);
  const sorted = [...matches].sort((a, b) => compareCompletedResults(a, b, sort));

  const todayMatches = sorted.filter((m) => localDateKey(new Date(m.date)) === todayKey);
  const otherMatches = sorted.filter((m) => localDateKey(new Date(m.date)) !== todayKey);

  const buckets = new Map<string, MergedMatch[]>();
  for (const match of otherMatches) {
    const key = localDateKey(new Date(match.date));
    const list = buckets.get(key) ?? [];
    list.push(match);
    buckets.set(key, list);
  }

  const sections: ResultsDaySection[] = [];
  if (todayMatches.length > 0) {
    sections.push({ label: "Today", dateKey: todayKey, isToday: true, matches: todayMatches });
  }

  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
  for (const [dateKey, list] of [...buckets.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const label = formatter.format(new Date(`${dateKey}T12:00:00`));
    sections.push({ label, dateKey, isToday: false, matches: list });
  }

  return sections;
}

export function groupResultsForView(
  liveMatches: Record<string, MergedMatch>,
  filters: ResultsFilters,
  teams: Record<string, Team> = {}
): {
  daySections: ResultsDaySection[];
  roundSections: ResultsSection[];
} {
  const filtered = filterCompletedResults(liveMatches, filters, teams);
  return {
    daySections: groupResultsByDay(filtered, filters.sort),
    roundSections: groupLockedResults(filtered),
  };
}
