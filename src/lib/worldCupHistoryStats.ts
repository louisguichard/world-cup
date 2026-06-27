import type { AllTimeLeader } from "../data/worldCupAllTimeLeaders";
import type {
  WorldCupAwardEntry,
  WorldCupHistoryBundle,
  WorldCupHistoryStatsSnapshot,
  WorldCupTournamentDetail,
} from "../types/worldCupHistory";

function awardByYear(awards: WorldCupAwardEntry[], year: number): WorldCupAwardEntry | undefined {
  return awards.find((a) => a.year === year);
}

/** Merge list endpoints into a single tournament timeline with awards attached. */
export function mergeWorldCupHistoryBundle(bundle: WorldCupHistoryBundle): WorldCupHistoryBundle {
  const byYear = new Map<number, WorldCupTournamentDetail>();

  for (const cup of bundle.worldCups) {
    byYear.set(cup.year, { ...cup });
  }

  for (const winner of bundle.winners) {
    const existing = byYear.get(winner.year);
    byYear.set(winner.year, {
      year: winner.year,
      host: existing?.host ?? winner.host,
      winner: existing?.winner ?? winner.winner,
      runnerUp: existing?.runnerUp ?? winner.runnerUp,
      thirdPlace: existing?.thirdPlace ?? winner.thirdPlace,
      goldenBall: existing?.goldenBall ?? awardByYear(bundle.goldenBall, winner.year),
      goldenBoot: existing?.goldenBoot ?? awardByYear(bundle.goldenBoot, winner.year),
      goldenGlove: existing?.goldenGlove ?? awardByYear(bundle.goldenGlove, winner.year),
      bestYoungPlayer: existing?.bestYoungPlayer ?? awardByYear(bundle.bestYoungPlayer, winner.year),
      teamsCount: existing?.teamsCount,
      attendance: existing?.attendance,
      raw: existing?.raw,
    });
  }

  for (const [key, detail] of Object.entries(bundle.yearDetails)) {
    const year = Number(key);
    if (!Number.isFinite(year)) continue;
    const existing = byYear.get(year);
    byYear.set(year, { ...existing, ...detail, year });
  }

  const worldCups = [...byYear.values()].sort((a, b) => b.year - a.year);

  return {
    ...bundle,
    worldCups,
    partial: bundle.partial || bundle.unavailable.length > 0,
  };
}

export function deriveTitleLeaders(bundle: WorldCupHistoryBundle | null): AllTimeLeader[] {
  if (!bundle?.winners.length) return [];
  const counts = new Map<string, number>();
  for (const entry of bundle.winners) {
    counts.set(entry.winner, (counts.get(entry.winner) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([team, value], index, arr) => {
      const prev = index > 0 ? arr[index - 1]?.[1] : undefined;
      const rank = prev === value ? (index > 0 ? index : 1) : index + 1;
      return {
        rank,
        player: team,
        country: team,
        value,
      };
    });
}

export function deriveBootLeaders(bundle: WorldCupHistoryBundle | null): AllTimeLeader[] {
  if (!bundle?.goldenBoot.length) return [];
  const totals = new Map<string, { player: string; country: string; goals: number }>();

  for (const entry of bundle.goldenBoot) {
    const goals = entry.goals ?? 0;
    const key = entry.player;
    const existing = totals.get(key);
    if (!existing || goals > existing.goals) {
      totals.set(key, { player: entry.player, country: entry.country, goals });
    }
  }

  return [...totals.values()]
    .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player))
    .slice(0, 8)
    .map((entry, index) => ({
      rank: index + 1,
      player: entry.player,
      country: entry.country,
      value: entry.goals,
      note: "Best single-tournament tally",
    }));
}

export function buildWorldCupHistoryStats(bundle: WorldCupHistoryBundle | null): WorldCupHistoryStatsSnapshot {
  return {
    titleLeaders: deriveTitleLeaders(bundle),
    topScorersFromBoot: deriveBootLeaders(bundle),
    awardCounts: {
      goldenBall: bundle?.goldenBall.length ?? 0,
      goldenBoot: bundle?.goldenBoot.length ?? 0,
      goldenGlove: bundle?.goldenGlove.length ?? 0,
      bestYoungPlayer: bundle?.bestYoungPlayer.length ?? 0,
    },
    editions: bundle?.worldCups.length ?? bundle?.winners.length ?? 0,
  };
}

export function getTournamentByYear(
  bundle: WorldCupHistoryBundle | null,
  year: number
): WorldCupTournamentDetail | undefined {
  if (!bundle) return undefined;
  return bundle.yearDetails[String(year)] ?? bundle.worldCups.find((c) => c.year === year);
}
