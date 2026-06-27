import type { Lineup } from "../../types";
import { mapWcLineups } from "./mapWcLineups";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractPlayers(side: Record<string, unknown>): {
  startingXI: unknown[];
  substitutes: unknown[];
  formation: string;
  manager?: string;
} {
  const players = side.players;
  if (Array.isArray(players)) {
    const startingXI = players.filter((p) => isRecord(p) && !p.substitute);
    const substitutes = players.filter((p) => isRecord(p) && p.substitute);
    return {
      startingXI,
      substitutes,
      formation: String(side.formation ?? "4-3-3"),
      manager: typeof side.manager === "string" ? side.manager : undefined,
    };
  }

  return {
    startingXI: (side.startingXI as unknown[]) ?? (side.lineup as unknown[]) ?? [],
    substitutes: (side.substitutes as unknown[]) ?? (side.subs as unknown[]) ?? [],
    formation: String(side.formation ?? "4-3-3"),
    manager: typeof side.manager === "string" ? side.manager : undefined,
  };
}

/** Best-effort SofaScore 6 / Rapid lineups → Lineup[]. */
export function mapSofaMatchLineups(raw: unknown): Lineup[] {
  if (!raw || typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;
  const fromWc = mapWcLineups(raw as Parameters<typeof mapWcLineups>[0]);
  if (fromWc.length > 0) return fromWc;

  const lineups: Lineup[] = [];
  const homeSide = root.home ?? root.homeTeam;
  const awaySide = root.away ?? root.awayTeam;

  if (isRecord(homeSide)) {
    const { startingXI, substitutes, formation, manager } = extractPlayers(homeSide);
    if (startingXI.length > 0) {
      lineups.push({
        team: "home",
        formation,
        manager,
        startingXI: startingXI.map((p, i) => mapSofaPlayer(p, i)),
        substitutes: substitutes.map((p, i) => mapSofaPlayer(p, i)),
      });
    }
  }

  if (isRecord(awaySide)) {
    const { startingXI, substitutes, formation, manager } = extractPlayers(awaySide);
    if (startingXI.length > 0) {
      lineups.push({
        team: "away",
        formation,
        manager,
        startingXI: startingXI.map((p, i) => mapSofaPlayer(p, i)),
        substitutes: substitutes.map((p, i) => mapSofaPlayer(p, i)),
      });
    }
  }

  return lineups;
}

function mapSofaPlayer(raw: unknown, index: number): import("../../types").LineupPlayer {
  const row = isRecord(raw) ? raw : {};
  const nested = isRecord(row.player) ? row.player : row;
  const name =
    String(nested.name ?? nested.shortName ?? nested.displayName ?? `Player ${index + 1}`);
  const number =
    nested.shirtNumber ?? nested.jerseyNumber ?? nested.number ?? row.shirtNumber ?? row.number;

  return {
    player: {
      id: String(nested.id ?? `sofa-${index}`),
      displayName: name,
      jerseyNumber: number != null ? Number(number) : undefined,
      position: typeof nested.position === "string" ? nested.position : undefined,
    },
    isCaptain: Boolean(row.captain ?? nested.captain),
    rating: nested.rating != null ? Number(nested.rating) : undefined,
  };
}
