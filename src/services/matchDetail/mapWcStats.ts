import type { MatchStatisticsBundle, TeamStats } from "../../types";
import type { WcStats } from "../WorldCup2026LiveClient";

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
  hitWoodwork: "hitWoodwork"
};

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

export function mapWcStats(
  matchId: string,
  raw: WcStats | null,
  period: "all" | "first_half" | "second_half" = "all"
): MatchStatisticsBundle {
  return {
    matchId,
    period,
    home: mapTeamStats(raw?.homeTeam),
    away: mapTeamStats(raw?.awayTeam)
  };
}
