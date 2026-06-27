import rankingsData from "../data/fifaRankings2026PreTournament.json";
import { WC2026_TEAM_NAMES } from "../data/wc2026TeamCatalog";
import type { FifaRanking } from "./ratings";
import { normalizeName } from "./normalize";

type FifaRankingEntry = {
  rank: number;
  team: string;
  points: number;
};

type FifaRankingsSnapshot = {
  meta: {
    edition: string;
    label: string;
    publishedUtc: string;
    note: string;
    source: string;
  };
  entries: FifaRankingEntry[];
};

const snapshot = rankingsData as FifaRankingsSnapshot;

/** FIFA display names that do not normalize to ESPN team keys. */
const FIFA_TEAM_ALIASES: Record<string, string> = {
  usa: "unitedstates",
  unitedstatesofamerica: "unitedstates",
};

function canonicalKey(teamName: string): string {
  const normalized = normalizeName(teamName);
  return FIFA_TEAM_ALIASES[normalized] ?? normalized;
}

/**
 * Official FIFA/Coca-Cola Men's World Ranking (11 June 2026 edition).
 * Published hours before the 2026 World Cup opening match — tournament tiebreaker reference.
 */
export function loadStaticFifaRankings(): Record<string, FifaRanking> {
  const rankings: Record<string, FifaRanking> = {};

  for (const entry of snapshot.entries) {
    if (!Number.isFinite(entry.rank) || !Number.isFinite(entry.points)) continue;
    const ranking: FifaRanking = { rank: entry.rank, points: entry.points };
    rankings[canonicalKey(entry.team)] = ranking;
  }

  // Ensure every WC 2026 squad name resolves (ESPN display names).
  for (const displayName of Object.values(WC2026_TEAM_NAMES)) {
    const key = canonicalKey(displayName);
    const hit = snapshot.entries.find((e) => canonicalKey(e.team) === key);
    if (hit && !rankings[key]) {
      rankings[key] = { rank: hit.rank, points: hit.points };
    }
  }

  return rankings;
}

export function staticFifaRankingsMeta(): FifaRankingsSnapshot["meta"] {
  return snapshot.meta;
}

export function staticFifaRankingsCount(): number {
  return snapshot.entries.length;
}
