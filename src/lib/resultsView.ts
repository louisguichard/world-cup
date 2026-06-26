import { localDateKey } from "./localDate";
import type { GroupLetter, MergedMatch, Stage } from "../types";
import { groupLockedResults, type ResultsSection } from "./resultsGrouping";

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

function totalGoals(m: MergedMatch): number {
  return (m.homeScore ?? 0) + (m.awayScore ?? 0);
}

function goalMargin(m: MergedMatch): number {
  return Math.abs((m.homeScore ?? 0) - (m.awayScore ?? 0));
}

function compareMatches(a: MergedMatch, b: MergedMatch, sort: ResultsSort): number {
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

export function filterCompletedResults(matches: MergedMatch[], filters: ResultsFilters): MergedMatch[] {
  const q = filters.search.trim().toLowerCase();
  return matches
    .filter((m) => m.status === "completed" && m.homeScore !== undefined)
    .filter((m) => {
      if (filters.stage === "all") return true;
      if (filters.stage === "group") return Boolean(m.group);
      return m.stage === filters.stage;
    })
    .filter((m) => {
      if (filters.group === "all") return true;
      return m.group === filters.group;
    })
    .filter((m) => {
      if (!q) return true;
      return m.homeTeamId.toLowerCase().includes(q) || m.awayTeamId.toLowerCase().includes(q);
    });
}

export function groupResultsByDay(matches: MergedMatch[], sort: ResultsSort): ResultsDaySection[] {
  const now = new Date();
  const todayKey = localDateKey(now);
  const sorted = [...matches].sort((a, b) => compareMatches(a, b, sort));

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

export function groupResultsForView(matches: MergedMatch[], filters: ResultsFilters): {
  daySections: ResultsDaySection[];
  roundSections: ResultsSection[];
} {
  const filtered = filterCompletedResults(matches, filters);
  return {
    daySections: groupResultsByDay(filtered, filters.sort),
    roundSections: groupLockedResults(filtered)
  };
}
