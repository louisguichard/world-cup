import type { Lineup, LineupPlayer, PlayerRef } from "../../types";
import type { WcLineup } from "../WorldCup2026LiveClient";

type RawPlayer = {
  id?: string | number;
  name?: string;
  displayName?: string;
  number?: number | string;
  jerseyNumber?: number | string;
  position?: string;
  isCaptain?: boolean;
  rating?: number | string;
};

// Default grid positions for common formations (0–100 scale, (0,0) = top-left)
const FORMATION_GRIDS: Record<string, Array<{ x: number; y: number }>> = {
  "4-3-3": [
    { x: 50, y: 90 }, // GK
    { x: 15, y: 70 }, { x: 38, y: 70 }, { x: 62, y: 70 }, { x: 85, y: 70 }, // DEF
    { x: 20, y: 48 }, { x: 50, y: 48 }, { x: 80, y: 48 }, // MID
    { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 } // FWD
  ],
  "4-4-2": [
    { x: 50, y: 90 },
    { x: 15, y: 70 }, { x: 38, y: 70 }, { x: 62, y: 70 }, { x: 85, y: 70 },
    { x: 15, y: 48 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 85, y: 48 },
    { x: 35, y: 20 }, { x: 65, y: 20 }
  ],
  "4-2-3-1": [
    { x: 50, y: 90 },
    { x: 15, y: 72 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 72 },
    { x: 35, y: 56 }, { x: 65, y: 56 },
    { x: 20, y: 36 }, { x: 50, y: 36 }, { x: 80, y: 36 },
    { x: 50, y: 16 }
  ],
  "3-5-2": [
    { x: 50, y: 90 },
    { x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 },
    { x: 10, y: 52 }, { x: 30, y: 52 }, { x: 50, y: 52 }, { x: 70, y: 52 }, { x: 90, y: 52 },
    { x: 35, y: 22 }, { x: 65, y: 22 }
  ],
  "3-4-3": [
    { x: 50, y: 90 },
    { x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 },
    { x: 15, y: 50 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 85, y: 50 },
    { x: 20, y: 22 }, { x: 50, y: 22 }, { x: 80, y: 22 }
  ],
  "5-3-2": [
    { x: 50, y: 90 },
    { x: 10, y: 70 }, { x: 28, y: 70 }, { x: 50, y: 70 }, { x: 72, y: 70 }, { x: 90, y: 70 },
    { x: 25, y: 48 }, { x: 50, y: 48 }, { x: 75, y: 48 },
    { x: 35, y: 22 }, { x: 65, y: 22 }
  ]
};

function getDefaultPositions(formation: string): Array<{ x: number; y: number }> {
  const positions = FORMATION_GRIDS[formation];
  if (positions) return positions;
  // Fallback: evenly space 11 players
  return Array.from({ length: 11 }, (_, i) => ({
    x: 50,
    y: 90 - i * 8
  }));
}

function mapPlayer(raw: RawPlayer, index: number, formation: string): LineupPlayer {
  const defaultPositions = getDefaultPositions(formation);
  const playerRef: PlayerRef = {
    id: String(raw.id ?? `player-${index}`),
    displayName: raw.displayName ?? raw.name ?? `Player ${index + 1}`,
    jerseyNumber:
      raw.jerseyNumber !== undefined
        ? Number(raw.jerseyNumber)
        : raw.number !== undefined
          ? Number(raw.number)
          : undefined,
    position: raw.position
  };

  return {
    player: playerRef,
    gridPosition: defaultPositions[index],
    rating: raw.rating !== undefined ? Number(raw.rating) : undefined,
    isCaptain: raw.isCaptain ?? false
  };
}

function mapTeamLineup(
  rawPlayers: unknown[] | undefined,
  rawSubs: unknown[] | undefined,
  formation: string,
  team: "home" | "away",
  manager?: string
): Lineup {
  const startingXI = (rawPlayers ?? [])
    .slice(0, 11)
    .map((p, i) => mapPlayer(p as RawPlayer, i, formation));

  const substitutes = (rawSubs ?? []).map((p, i) =>
    mapPlayer(p as RawPlayer, i, "")
  );

  return {
    team,
    formation,
    manager,
    startingXI,
    substitutes
  };
}

export function mapWcLineups(raw: WcLineup | null): Lineup[] {
  if (!raw) return [];
  const lineups: Lineup[] = [];

  if (raw.homeTeam) {
    const { startingXI, substitutes } = raw.homeTeam as {
      startingXI?: unknown[];
      substitutes?: unknown[];
      formation?: string;
      manager?: string;
    };
    const formation = (raw.homeTeam as { formation?: string }).formation ?? "4-3-3";
    const manager = (raw.homeTeam as { manager?: string }).manager;
    lineups.push(mapTeamLineup(startingXI, substitutes, formation, "home", manager));
  }

  if (raw.awayTeam) {
    const { startingXI, substitutes } = raw.awayTeam as {
      startingXI?: unknown[];
      substitutes?: unknown[];
      formation?: string;
      manager?: string;
    };
    const formation = (raw.awayTeam as { formation?: string }).formation ?? "4-3-3";
    const manager = (raw.awayTeam as { manager?: string }).manager;
    lineups.push(mapTeamLineup(startingXI, substitutes, formation, "away", manager));
  }

  return lineups;
}
