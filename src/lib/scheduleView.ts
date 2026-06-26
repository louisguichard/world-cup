import type { MergedMatch } from "../types";

export type ScheduleSort = "time" | "group" | "stage";
export type ScheduleStatusFilter = "all" | "upcoming" | "live" | "completed";

const stageOrder: Record<string, number> = {
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 4,
  Final: 5
};

export function filterScheduleMatches(
  matches: MergedMatch[],
  status: ScheduleStatusFilter
): MergedMatch[] {
  if (status === "all") return matches;
  if (status === "live") return matches.filter((m) => m.status === "live");
  if (status === "completed") {
    return matches.filter((m) => m.status === "completed" || m.locked);
  }
  return matches.filter((m) => m.status === "scheduled" && !m.locked);
}

export function sortScheduleMatches(matches: MergedMatch[], sort: ScheduleSort): MergedMatch[] {
  const list = [...matches];
  switch (sort) {
    case "group":
      return list.sort(
        (a, b) =>
          (a.group ?? "Z").localeCompare(b.group ?? "Z") ||
          Date.parse(a.date) - Date.parse(b.date)
      );
    case "stage":
      return list.sort(
        (a, b) =>
          (stageOrder[a.stage ?? ""] ?? 0) - (stageOrder[b.stage ?? ""] ?? 0) ||
          (a.group ?? "Z").localeCompare(b.group ?? "Z") ||
          Date.parse(a.date) - Date.parse(b.date)
      );
    case "time":
    default:
      return list.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }
}

/** Prefer today's bucket; else first future day; else last day with matches. */
export function defaultScheduleDateKey(
  dateKeys: string[],
  todayKey: string
): string | null {
  if (dateKeys.length === 0) return null;
  if (dateKeys.includes(todayKey)) return todayKey;
  const future = dateKeys.find((key) => key >= todayKey);
  if (future) return future;
  return dateKeys[dateKeys.length - 1] ?? null;
}
