import {
  mergeTeamWithCatalog,
  resolveCanonicalTeamId,
  resolveTeamForDisplay,
} from "../data/wc2026TeamCatalog";
import { materializeFullSchedule } from "./materializeFullSchedule";
import type { MergedMatch, Team } from "../types";
import type { FootballPredictionMatch } from "../services/FootballPredictionClient";

const TEAM_ALIASES: Record<string, string[]> = {
  usa: ["united states", "u.s.a.", "u.s.", "usmnt"],
  eng: ["england"],
  kor: ["south korea", "korea republic", "republic of korea"],
  ksa: ["saudi arabia"],
  civ: ["ivory coast", "cote d'ivoire", "côte d'ivoire"],
  cod: ["dr congo", "democratic republic of congo", "congo dr"],
  cpv: ["cape verde", "cabo verde"],
  cuw: ["curacao", "curaçao"],
  bih: ["bosnia", "bosnia and herzegovina", "bosnia & herzegovina"],
  rsa: ["south africa"],
  nzl: ["new zealand"],
  uae: ["united arab emirates"],
};

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

export function resolveTeamFromStore(
  teamId: string | undefined,
  teams: Record<string, Team>
): Team | undefined {
  if (!teamId?.trim()) return undefined;

  const direct = teams[teamId];
  if (direct) return mergeTeamWithCatalog(direct);

  const canonical = resolveCanonicalTeamId(teamId);
  const byCanonical = teams[canonical];
  if (byCanonical) return mergeTeamWithCatalog(byCanonical);

  for (const candidate of Object.values(teams)) {
    if (candidate.id === teamId) return mergeTeamWithCatalog(candidate);
    if (resolveCanonicalTeamId(candidate.id, candidate) === canonical) {
      return mergeTeamWithCatalog(candidate);
    }
  }

  return resolveTeamForDisplay(teamId);
}

function teamNamesFor(team: Team): string[] {
  const names = new Set<string>();
  for (const n of [team.name, team.shortName, team.abbreviation, team.id]) {
    if (n) names.add(normalizeName(n));
  }
  const abbrev = team.abbreviation?.toLowerCase() ?? team.id?.toLowerCase();
  for (const alias of TEAM_ALIASES[abbrev] ?? []) {
    names.add(normalizeName(alias));
  }
  return [...names];
}

export function predictionTeamMatchesTeam(predictionName: string, team: Team): boolean {
  const norm = normalizeName(predictionName);
  return teamNamesFor(team).some(
    (candidate) => norm === candidate || norm.includes(candidate) || candidate.includes(norm)
  );
}

export function linkPredictionToMatch(
  prediction: FootballPredictionMatch,
  match: MergedMatch,
  teams: Record<string, Team>
): boolean {
  const home = resolveTeamFromStore(match.homeTeamId, teams);
  const away = resolveTeamFromStore(match.awayTeamId, teams);
  if (!home || !away) return false;

  const homeOk = predictionTeamMatchesTeam(prediction.homeTeam, home);
  const awayOk = predictionTeamMatchesTeam(prediction.awayTeam, away);
  if (!homeOk || !awayOk) return false;

  const matchDate = match.date.slice(0, 10);
  if (prediction.date && prediction.date !== matchDate) {
    const predDay = prediction.date.slice(0, 10);
    if (predDay !== matchDate) return false;
  }

  return true;
}

function matchIndexKeys(match: MergedMatch): string[] {
  return [match.matchId, match.id, match.espnEventId].filter(
    (key): key is string => Boolean(key?.trim())
  );
}

export function buildPredictionIndex(
  predictions: FootballPredictionMatch[],
  matches: MergedMatch[],
  teams: Record<string, Team>,
  opts?: { includeScheduleShells?: boolean }
): Record<string, FootballPredictionMatch> {
  const scheduleMatches =
    matches.length > 0
      ? matches
      : opts?.includeScheduleShells
        ? materializeFullSchedule(teams, {})
        : [];

  const index: Record<string, FootballPredictionMatch> = {};

  for (const match of scheduleMatches) {
    const found = predictions.find((p) => linkPredictionToMatch(p, match, teams));
    if (!found) continue;
    for (const key of matchIndexKeys(match)) {
      index[key] = found;
    }
  }

  return index;
}

export function predictionsForTeam(
  team: Team,
  predictions: FootballPredictionMatch[]
): FootballPredictionMatch[] {
  return predictions.filter(
    (p) => predictionTeamMatchesTeam(p.homeTeam, team) || predictionTeamMatchesTeam(p.awayTeam, team)
  );
}

export function formatPredictionPick(prediction: string): string {
  switch (prediction.toUpperCase()) {
    case "1":
      return "Home win";
    case "2":
      return "Away win";
    case "X":
      return "Draw";
    case "O":
    case "OVER":
      return "Over";
    case "U":
    case "UNDER":
      return "Under";
    case "YES":
      return "BTTS Yes";
    case "NO":
      return "BTTS No";
    default:
      return prediction;
  }
}

export type PredictionPickSide = "home" | "away" | "draw" | "other";

export function resolvePredictionPick(
  prediction: string,
  homeTeam: string,
  awayTeam: string
): { shortLabel: string; pickedTeam: string | null; side: PredictionPickSide } {
  switch (prediction.toUpperCase()) {
    case "1":
      return { shortLabel: `${homeTeam} to win`, pickedTeam: homeTeam, side: "home" };
    case "2":
      return { shortLabel: `${awayTeam} to win`, pickedTeam: awayTeam, side: "away" };
    case "X":
      return { shortLabel: `Tie: ${homeTeam} vs ${awayTeam}`, pickedTeam: null, side: "draw" };
    default:
      return { shortLabel: formatPredictionPick(prediction), pickedTeam: null, side: "other" };
  }
}

export function lookupFootballPrediction(
  index: Record<string, FootballPredictionMatch>,
  match: Pick<MergedMatch, "id" | "matchId" | "espnEventId">
): FootballPredictionMatch | null {
  for (const key of matchIndexKeys(match as MergedMatch)) {
    const hit = index[key];
    if (hit) return hit;
  }
  return null;
}
