import type { MatchStatisticsBundle, TeamStats } from "../../types";
import type { WcStats } from "../WorldCup2026LiveClient";

const STAT_NAME_MAP: Record<string, keyof TeamStats> = {
  "expected goals (xg)": "expectedGoals",
  "ball possession": "ballPossession",
  "total shots": "totalShots",
  "shots on target": "shotsOnTarget",
  "shots off target": "shotsOffTarget",
  "blocked shots": "blockedShots",
  "big chances": "bigChances",
  "big chances missed": "bigChancesMissed",
  corners: "corners",
  "free kicks": "freeKicks",
  offsides: "offsides",
  fouls: "fouls",
  "yellow cards": "yellowCards",
  "red cards": "redCards",
  tackles: "tackles",
  interceptions: "interceptions",
  saves: "saves",
};

const STAT_KEY_MAP: Record<string, keyof TeamStats> = {
  ball_possession: "ballPossession",
  ballPossession: "ballPossession",
  expected_goals: "expectedGoals",
  expectedGoals: "expectedGoals",
  total_shots: "totalShots",
  totalShots: "totalShots",
  shots_on_target: "shotsOnTarget",
  shotsOnTarget: "shotsOnTarget",
  shots_off_target: "shotsOffTarget",
  shotsOffTarget: "shotsOffTarget",
  blocked_shots: "blockedShots",
  blockedShots: "blockedShots",
  big_chances: "bigChances",
  bigChances: "bigChances",
  big_chances_missed: "bigChancesMissed",
  bigChancesMissed: "bigChancesMissed",
  corners: "corners",
  free_kicks: "freeKicks",
  freeKicks: "freeKicks",
  offsides: "offsides",
  fouls: "fouls",
  yellow_cards: "yellowCards",
  yellowCards: "yellowCards",
  red_cards: "redCards",
  redCards: "redCards",
  pass_accuracy: "passAccuracy",
  passAccuracy: "passAccuracy",
  total_passes: "totalPasses",
  totalPasses: "totalPasses",
  tackles: "tackles",
  interceptions: "interceptions",
  saves: "saves",
  goal_kicks: "goalKicks",
  goalKicks: "goalKicks",
  throw_ins: "throwIns",
  throwIns: "throwIns",
  hit_woodwork: "hitWoodwork",
  hitWoodwork: "hitWoodwork",
};

function parseNumeric(value: string | number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value);
  const pct = text.match(/^(\d+(?:\.\d+)?)\s*%/);
  if (pct?.[1]) return Number(pct[1]);
  const leading = text.match(/^(\d+(?:\.\d+)?)/);
  if (leading?.[1]) return Number(leading[1]);
  return undefined;
}

function mapTeamStats(raw: Record<string, number | string> | undefined): TeamStats {
  if (!raw) return {};
  const stats: TeamStats = {};
  for (const [key, val] of Object.entries(raw)) {
    const mapped = STAT_KEY_MAP[key];
    if (mapped && typeof val === "number") {
      (stats as Record<string, number>)[mapped] = val;
    } else if (mapped && typeof val === "string") {
      const n = parseFloat(val);
      if (!isNaN(n)) (stats as Record<string, number>)[mapped] = n;
    }
  }
  return stats;
}

function mapSectionStats(raw: WcStats | null): { home: TeamStats; away: TeamStats } {
  const home: TeamStats = {};
  const away: TeamStats = {};
  if (!raw?.sections?.length) {
    return { home: mapTeamStats(raw?.homeTeam), away: mapTeamStats(raw?.awayTeam) };
  }

  const matchSection = raw.sections.find((s) => s.section.toLowerCase() === "match") ?? raw.sections[0];
  for (const group of matchSection?.groups ?? []) {
    for (const row of group.stats) {
      const key = STAT_NAME_MAP[row.name.toLowerCase()];
      if (!key) continue;
      const homeVal = parseNumeric(row.home);
      const awayVal = parseNumeric(row.away);
      if (homeVal !== undefined) (home as Record<string, number>)[key] = homeVal;
      if (awayVal !== undefined) (away as Record<string, number>)[key] = awayVal;
    }
  }

  return { home, away };
}

export function mapWcStats(
  matchId: string,
  raw: WcStats | null,
  period: "all" | "first_half" | "second_half" = "all"
): MatchStatisticsBundle {
  const mapped = mapSectionStats(raw);
  return {
    matchId,
    period,
    home: mapped.home,
    away: mapped.away,
  };
}
