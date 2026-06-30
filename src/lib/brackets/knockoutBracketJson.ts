import bracketJson from "../../data/world_cup_2026_knockout_bracket.json";

/** Strip team name suffix: `"1A (Mexico)"` → `"1A"`, `"3E (Ecuador)"` → `"3E"`. */
export function parseBracketSeedLabel(raw: string): string {
  const token = raw.trim().split(/\s+/)[0] ?? raw;
  return token.replace(/[()]/g, "");
}

type ProgressionRound = Record<string, { from: string[] }>;

function feedersFromProgression(round: ProgressionRound, matchNumber: number): [string, string] {
  const entry = round[String(matchNumber)];
  if (!entry?.from || entry.from.length !== 2) {
    throw new Error(`Missing progression feeders for M${matchNumber}`);
  }
  const [home, away] = entry.from;
  const toSeed = (feeder: string): string => {
    if (feeder.endsWith("_winner")) return `W${feeder.replace("_winner", "")}`;
    if (feeder.endsWith("_loser")) return `L${feeder.replace("_loser", "")}`;
    return `W${feeder}`;
  };
  return [toSeed(home), toSeed(away)];
}

const info = bracketJson.tournament_info;
const progression = info.bracket_progression;

/** R32 fixtures normalized from the official JSON file. */
export function r32FixturesFromJson(): Array<[string, string, string]> {
  return Object.entries(info.round_of_32_matches)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([matchNum, slots]) => [
      `M${matchNum}`,
      parseBracketSeedLabel(slots.home),
      parseBracketSeedLabel(slots.away),
    ]);
}

export function r16FixturesFromJson(): Array<[string, string, string]> {
  return [89, 90, 91, 92, 93, 94, 95, 96].map((n) => {
    const [home, away] = feedersFromProgression(progression.round_of_16, n);
    return [`M${n}`, home, away] as [string, string, string];
  });
}

export function qfFixturesFromJson(): Array<[string, string, string]> {
  return [97, 98, 99, 100].map((n) => {
    const [home, away] = feedersFromProgression(progression.quarter_finals, n);
    return [`M${n}`, home, away] as [string, string, string];
  });
}

export function sfFixturesFromJson(): Array<[string, string, string]> {
  return [101, 102].map((n) => {
    const [home, away] = feedersFromProgression(progression.semi_finals, n);
    return [`M${n}`, home, away] as [string, string, string];
  });
}

export function finalFixtureFromJson(): [string, string, string] {
  const [home, away] = feedersFromProgression(progression.final, 104);
  return ["M104", home, away];
}

export function thirdPlaceFixtureFromJson(): [string, string, string] {
  const [home, away] = feedersFromProgression(progression.third_place, 103);
  return ["M103", home, away];
}
