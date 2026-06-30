import { getAllScheduleEntries } from "../services/BroadcastLookup";
import type { MatchScheduleEntry, MergedMatch, Stage } from "../types";

export type ResultsSection = {
  key: string;
  label: string;
  sortOrder: number;
  matches: MergedMatch[];
};

const STAGE_SORT_ORDER: Record<string, number> = {
  group: 0,
  round_of_32: 100,
  round_of_16: 200,
  quarterfinal: 300,
  semifinal: 400,
  third_place: 500,
  final: 600,
  knockout: 150
};

const STAGE_LABELS: Record<string, string> = {
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarterfinal: "Quarterfinals",
  semifinal: "Semifinals",
  third_place: "Third Place",
  final: "Final",
  knockout: "Knockout"
};

const STAGE_TO_SCHEDULE: Record<Stage, string> = {
  R32: "round_of_32",
  R16: "round_of_16",
  QF: "quarterfinal",
  SF: "semifinal",
  ThirdPlace: "third_place",
  Final: "final",
};

const scheduleByMatchId = new Map<string, MatchScheduleEntry>(
  getAllScheduleEntries().map((entry) => [`M${entry.matchNumber}`, entry])
);

function groupMatchday(group: string, date: string): number {
  const groupMatches = getAllScheduleEntries()
    .filter((entry) => entry.group === group)
    .sort((a, b) => Date.parse(a.kickoff.utc) - Date.parse(b.kickoff.utc));

  const uniqueDates = [...new Set(groupMatches.map((entry) => entry.kickoff.utc.slice(0, 10)))].sort();
  const matchDate = date.slice(0, 10);
  const index = uniqueDates.indexOf(matchDate);
  return index >= 0 ? index + 1 : 1;
}

export function resolveScheduleStage(match: MergedMatch): string {
  if (match.matchId) {
    const entry = scheduleByMatchId.get(match.matchId);
    if (entry?.stage) return entry.stage;
  }
  if (match.stage) {
    return STAGE_TO_SCHEDULE[match.stage] ?? "knockout";
  }
  return "knockout";
}

/** User-facing knockout stage label (e.g. "Round of 32"). */
export function getKnockoutStageLabel(match: MergedMatch): string | undefined {
  if (match.group) return undefined;
  const stage = resolveScheduleStage(match);
  return STAGE_LABELS[stage] ?? "Knockout";
}

function sectionKeyForMatch(match: MergedMatch): { key: string; label: string; sortOrder: number } {
  if (match.group) {
    const matchday = groupMatchday(match.group, match.date);
    const groupIndex = match.group.charCodeAt(0) - "A".charCodeAt(0);
    return {
      key: `group-${match.group}-md-${matchday}`,
      label: `Group ${match.group} — Matchday ${matchday}`,
      sortOrder: STAGE_SORT_ORDER.group + groupIndex * 10 + matchday
    };
  }

  const stage = resolveScheduleStage(match);
  return {
    key: `knockout-${stage}-${match.id}`,
    label: STAGE_LABELS[stage] ?? "Knockout",
    sortOrder: (STAGE_SORT_ORDER[stage] ?? STAGE_SORT_ORDER.knockout) + Date.parse(match.date) / 1_000_000
  };
}

export function groupLockedResults(matches: MergedMatch[]): ResultsSection[] {
  const locked = matches.filter((m) => m.locked);
  const sectionMap = new Map<string, ResultsSection>();

  for (const match of locked) {
    const { key, label, sortOrder } = sectionKeyForMatch(match);
    const sectionKey = match.group ? key : `${resolveScheduleStage(match)}`;

    const existing = sectionMap.get(sectionKey);
    if (existing) {
      existing.matches.push(match);
      continue;
    }

    sectionMap.set(sectionKey, {
      key: sectionKey,
      label: match.group ? label : STAGE_LABELS[resolveScheduleStage(match)] ?? "Knockout",
      sortOrder: match.group ? sortOrder : STAGE_SORT_ORDER[resolveScheduleStage(match)] ?? 150,
      matches: [match]
    });
  }

  const sections = [...sectionMap.values()];
  for (const section of sections) {
    section.matches.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }

  return sections.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}
