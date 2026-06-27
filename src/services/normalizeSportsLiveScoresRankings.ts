import { normalizeName } from "../lib/normalize";
import type { FifaRanking } from "../lib/ratings";
import type { SportsLiveScoresRankingsResponse } from "../types/sportsLiveScores";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

function isPlaceholderRow(row: Record<string, unknown>): boolean {
  const text = pickString(row, ["Text", "text", "message", "Sorry"]);
  if (text && /sorry|no standings|no data|not available/i.test(text)) return true;
  if ("Text" in row && Object.keys(row).length <= 2) return true;
  return false;
}

function teamNameFromRow(row: Record<string, unknown>): string | undefined {
  const nested = isRecord(row.team) ? row.team : isRecord(row.Team) ? row.Team : null;
  if (nested) {
    return (
      pickString(nested, ["name", "Name", "team_name", "TeamName", "title", "Title"]) ??
      pickString(row, ["team_name", "TeamName", "name", "Name", "country", "Country"])
    );
  }
  return pickString(row, [
    "team_name",
    "TeamName",
    "name",
    "Name",
    "country",
    "Country",
    "team",
    "Team",
  ]);
}

function rankFromRow(row: Record<string, unknown>, index: number): number | undefined {
  return (
    num(row.rank) ??
    num(row.Rank) ??
    num(row.position) ??
    num(row.Position) ??
    num(row.pos) ??
    num(row.ranking) ??
    num(row.Ranking) ??
    (index >= 0 ? index + 1 : undefined)
  );
}

function pointsFromRow(row: Record<string, unknown>): number | undefined {
  return (
    num(row.points) ??
    num(row.Points) ??
    num(row.total_points) ??
    num(row.TotalPoints) ??
    num(row.decimal_total_points) ??
    num(row.DecimalTotalPoints) ??
    num(row.pts)
  );
}

/** Map Sports Live Scores league rankings → bootstrap FIFA map keyed by normalized team name. */
export function normalizeSportsLiveScoresRankings(
  raw: SportsLiveScoresRankingsResponse | null | undefined
): Record<string, FifaRanking> {
  const rankings: Record<string, FifaRanking> = {};
  if (!raw || !Array.isArray(raw.rankings)) return rankings;

  raw.rankings.forEach((entry, index) => {
    if (!isRecord(entry) || isPlaceholderRow(entry)) return;
    const name = teamNameFromRow(entry);
    const rank = rankFromRow(entry, index);
    const points = pointsFromRow(entry);
    if (!name || rank == null) return;
    rankings[normalizeName(name)] = { rank, points: points ?? 0 };
  });

  return rankings;
}
