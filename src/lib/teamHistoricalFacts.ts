import type { Team } from "../types";
import {
  ALL_TIME_APPEARANCES,
  ALL_TIME_TEAM_TITLES,
  ALL_TIME_TOP_SCORERS,
} from "../data/worldCupAllTimeLeaders";

export type HistoricalFact = {
  id: string;
  label: string;
  detail: string;
};

export type TeamHistoricalResult = {
  facts: HistoricalFact[];
  hasNotable: boolean;
};

function normalizeCountry(name: string): string {
  return name.trim().toLowerCase();
}

function matchesCountry(teamName: string, country: string): boolean {
  const t = normalizeCountry(teamName);
  const c = normalizeCountry(country);
  return t === c || t.includes(c) || c.includes(t);
}

function titleFactForTeam(team: Team): HistoricalFact | null {
  const entry = ALL_TIME_TEAM_TITLES.find((row) => matchesCountry(team.name, row.player));
  if (!entry || entry.value < 1) return null;
  const titles = entry.value;
  return {
    id: "wc-titles",
    label: "World Cup titles",
    detail: `${team.name} has won ${titles} FIFA World Cup${titles === 1 ? "" : "s"}.`,
  };
}

function scorerFactsForTeam(team: Team): HistoricalFact[] {
  return ALL_TIME_TOP_SCORERS.filter(
    (row) => row.rank <= 5 && matchesCountry(team.name, row.country)
  ).map((row) => ({
    id: `scorer-${row.player}`,
    label: "All-time World Cup scorer",
    detail: `${row.player} scored ${row.value} World Cup goals for ${row.country}${row.note ? ` (${row.note})` : ""}.`,
  }));
}

function appearanceFactsForTeam(team: Team): HistoricalFact[] {
  return ALL_TIME_APPEARANCES.filter(
    (row) => row.rank <= 3 && matchesCountry(team.name, row.country)
  ).map((row) => ({
    id: `apps-${row.player}`,
    label: "World Cup appearances record",
    detail: `${row.player} made ${row.value} World Cup appearances for ${row.country}${row.note ? ` (${row.note})` : ""}.`,
  }));
}

/** Derive notable historical facts from static/API-backed data only. */
export function buildTeamHistoricalFacts(
  team: Team,
  opts?: { managerName?: string | null }
): TeamHistoricalResult {
  const facts: HistoricalFact[] = [];

  const title = titleFactForTeam(team);
  if (title) facts.push(title);

  facts.push(...scorerFactsForTeam(team));
  facts.push(...appearanceFactsForTeam(team));

  if (opts?.managerName) {
    facts.push({
      id: "coach",
      label: "Head coach",
      detail: `${opts.managerName} is listed as head coach.`,
    });
  }

  const hasNotable = facts.some(
    (f) => f.id === "wc-titles" || f.id.startsWith("scorer-") || f.id.startsWith("apps-")
  );

  return { facts, hasNotable };
}
