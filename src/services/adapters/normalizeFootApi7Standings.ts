import type { GroupLetter, GroupStanding, TeamRecord } from "../../types";
import { resolveCatalogTeamIdByName } from "../../data/wc2026TeamCatalog";
import { groupLetters } from "../../types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

function parseGroupLabel(raw: unknown): GroupLetter | undefined {
  if (typeof raw !== "string") return undefined;
  const match = raw.match(/group\s*([a-l])/i) ?? raw.match(/^([a-l])$/i);
  const letter = match?.[1]?.toUpperCase();
  if (letter && (groupLetters as readonly string[]).includes(letter)) {
    return letter as GroupLetter;
  }
  return undefined;
}

function teamNameFromRow(row: Record<string, unknown>): string {
  const team = isRecord(row.team) ? row.team : undefined;
  return String(team?.name ?? team?.shortName ?? row.name ?? row.teamName ?? "");
}

function rowToTeamRecord(row: Record<string, unknown>, group: GroupLetter): TeamRecord {
  const name = teamNameFromRow(row);
  const team = isRecord(row.team) ? row.team : row;
  return {
    teamId: resolveCatalogTeamIdByName(name) ?? name.trim().toLowerCase().replace(/\s+/g, "-"),
    group,
    played: num(row.matches ?? row.played ?? row.gamesPlayed),
    wins: num(row.wins ?? row.won),
    draws: num(row.draws ?? row.drawn),
    losses: num(row.losses ?? row.lost),
    goalsFor: num(row.scoresFor ?? row.goalsFor ?? row.goalsScored),
    goalsAgainst: num(row.scoresAgainst ?? row.goalsAgainst ?? row.goalsConceded),
    goalDifference: num(row.pointsDiff ?? row.goalDifference ?? row.goalDiff),
    points: num(row.points),
    conduct: 0,
    rating: 0,
  };
}

function standingsFromGroupList(groups: unknown[]): GroupStanding[] {
  const result: GroupStanding[] = [];

  for (const entry of groups) {
    if (!isRecord(entry)) continue;
    const group =
      parseGroupLabel(entry.name ?? entry.group ?? entry.slug ?? entry.title) ??
      parseGroupLabel(String(entry.groupName ?? ""));
    if (!group) continue;

    const rowsSource =
      entry.teamStandings ??
      entry.standings ??
      entry.rows ??
      entry.teams;
    if (!Array.isArray(rowsSource)) continue;

    const rows = rowsSource
      .filter(isRecord)
      .map((row) => rowToTeamRecord(row, group))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

    if (rows.length > 0) result.push({ group, rows });
  }

  return result;
}

function standingsFromTables(tables: unknown[]): GroupStanding[] {
  const result: GroupStanding[] = [];

  for (const table of tables) {
    if (!isRecord(table)) continue;
    const group = parseGroupLabel(
      table.name ?? table.group ?? (isRecord(table.tournament) ? table.tournament.name : undefined)
    );
    if (!group) continue;
    const rowsSource = table.rows ?? table.teamStandings ?? table.standings;
    if (!Array.isArray(rowsSource)) continue;

    const rows = rowsSource
      .filter(isRecord)
      .map((row) => rowToTeamRecord(row, group))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

    if (rows.length > 0) result.push({ group, rows });
  }

  return result;
}

/** Normalize FootAPI7 groups or standings payloads into GroupStanding[]. */
export function normalizeFootApi7Groups(raw: unknown): GroupStanding[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    const fromGroups = standingsFromGroupList(raw);
    if (fromGroups.length > 0) return fromGroups;
    return standingsFromTables(raw);
  }

  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.groups)) {
    const fromGroups = standingsFromGroupList(raw.groups);
    if (fromGroups.length > 0) return fromGroups;
  }

  if (Array.isArray(raw.standings)) {
    const nested = raw.standings;
    if (nested.every((item) => isRecord(item) && Array.isArray(item.rows))) {
      return standingsFromTables(nested);
    }
    return standingsFromGroupList(nested);
  }

  if (Array.isArray(raw.tables)) {
    return standingsFromTables(raw.tables);
  }

  return [];
}
