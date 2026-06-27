import type { MatchStatisticsBundle, TeamStats } from "../../types";

const STAT_NAME_MAP: Record<string, keyof TeamStats> = {
  "ball possession": "ballPossession",
  possession: "ballPossession",
  "expected goals (xg)": "expectedGoals",
  "expected goals": "expectedGoals",
  "total shots": "totalShots",
  "shots on target": "shotsOnTarget",
  "shots off target": "shotsOffTarget",
  "blocked shots": "blockedShots",
  "big chances": "bigChances",
  "big chances missed": "bigChancesMissed",
  corners: "corners",
  "corner kicks": "corners",
  "free kicks": "freeKicks",
  offsides: "offsides",
  fouls: "fouls",
  "yellow cards": "yellowCards",
  "red cards": "redCards",
  tackles: "tackles",
  interceptions: "interceptions",
  saves: "saves",
  "goalkeeper saves": "saves",
  "pass accuracy": "passAccuracy",
  "total passes": "totalPasses",
};

const STAT_KEY_MAP: Record<string, keyof TeamStats> = {
  ballPossession: "ballPossession",
  ball_possession: "ballPossession",
  expectedGoals: "expectedGoals",
  expected_goals: "expectedGoals",
  totalShots: "totalShots",
  total_shots: "totalShots",
  shotsOnTarget: "shotsOnTarget",
  shots_on_target: "shotsOnTarget",
  shotsOffTarget: "shotsOffTarget",
  shots_off_target: "shotsOffTarget",
  blockedShots: "blockedShots",
  blocked_shots: "blockedShots",
  bigChances: "bigChances",
  big_chances: "bigChances",
  bigChancesMissed: "bigChancesMissed",
  big_chances_missed: "bigChancesMissed",
  corners: "corners",
  freeKicks: "freeKicks",
  free_kicks: "freeKicks",
  offsides: "offsides",
  fouls: "fouls",
  yellowCards: "yellowCards",
  yellow_cards: "yellowCards",
  redCards: "redCards",
  red_cards: "redCards",
  passAccuracy: "passAccuracy",
  pass_accuracy: "passAccuracy",
  totalPasses: "totalPasses",
  total_passes: "totalPasses",
  tackles: "tackles",
  interceptions: "interceptions",
  saves: "saves",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseNumeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "");
  const pct = text.match(/^(\d+(?:\.\d+)?)\s*%/);
  if (pct?.[1]) return Number(pct[1]);
  const leading = text.match(/^(\d+(?:\.\d+)?)/);
  if (leading?.[1]) return Number(leading[1]);
  return undefined;
}

function applyStat(
  home: TeamStats,
  away: TeamStats,
  key: keyof TeamStats,
  homeVal: unknown,
  awayVal: unknown
): void {
  const h = parseNumeric(homeVal);
  const a = parseNumeric(awayVal);
  if (h !== undefined) (home as Record<string, number>)[key] = h;
  if (a !== undefined) (away as Record<string, number>)[key] = a;
}

function mapStatItem(
  home: TeamStats,
  away: TeamStats,
  item: Record<string, unknown>
): void {
  const name = String(item.name ?? item.label ?? "").toLowerCase();
  const key =
    STAT_KEY_MAP[String(item.key ?? item.statistic ?? "")] ??
    STAT_NAME_MAP[name];
  if (!key) return;

  applyStat(
    home,
    away,
    key,
    item.homeValue ?? item.home ?? item.homeTeam,
    item.awayValue ?? item.away ?? item.awayTeam
  );
}

function mapSofaStatisticsPeriod(
  period: Record<string, unknown>,
  home: TeamStats,
  away: TeamStats
): void {
  const groups = period.groups ?? period.statistics;
  if (!Array.isArray(groups)) return;

  for (const group of groups) {
    if (!isRecord(group)) continue;
    const items = group.statisticsItems ?? group.items ?? group.statistics;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (isRecord(item)) mapStatItem(home, away, item);
    }
  }
}

/** Best-effort SofaScore 6 / Rapid match statistics → MatchStatisticsBundle. */
export function mapSofaMatchStats(matchId: string, raw: unknown): MatchStatisticsBundle | null {
  if (!raw || typeof raw !== "object") return null;

  const home: TeamStats = {};
  const away: TeamStats = {};
  const root = raw as Record<string, unknown>;

  const periods = Array.isArray(root.statistics)
    ? root.statistics
    : Array.isArray(root.data)
      ? root.data
      : null;

  if (periods) {
    const allPeriod =
      periods.find(
        (p) =>
          isRecord(p) &&
          String(p.period ?? p.name ?? "").toUpperCase().includes("ALL")
      ) ?? periods[0];
    if (isRecord(allPeriod)) mapSofaStatisticsPeriod(allPeriod, home, away);
  }

  if (isRecord(root.home) && isRecord(root.away)) {
    for (const [key, val] of Object.entries(root.home)) {
      const mapped = STAT_KEY_MAP[key];
      if (mapped && typeof val === "number") (home as Record<string, number>)[mapped] = val;
    }
    for (const [key, val] of Object.entries(root.away)) {
      const mapped = STAT_KEY_MAP[key];
      if (mapped && typeof val === "number") (away as Record<string, number>)[mapped] = val;
    }
  }

  const hasData = Object.keys(home).length > 0 || Object.keys(away).length > 0;
  if (!hasData) return null;

  return { matchId, period: "all", home, away };
}
