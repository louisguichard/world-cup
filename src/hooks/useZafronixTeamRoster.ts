import { useEffect, useState } from "react";
import type { Team } from "../types";
import { fetchTeamRoster } from "../services/ZafronixClient";

export type ZafronixRosterPlayer = {
  name?: string;
  position?: string;
  number?: number;
  club?: string;
};

function normalizeRoster(raw: unknown): ZafronixRosterPlayer[] {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as Record<string, unknown>;
  const list = Array.isArray(record.players)
    ? record.players
    : Array.isArray(record.roster)
      ? record.roster
      : Array.isArray(raw)
        ? raw
        : [];
  const players: ZafronixRosterPlayer[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const p = entry as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name : undefined;
    if (!name) continue;
    players.push({
      name,
      position: typeof p.position === "string" ? p.position : undefined,
      number: typeof p.number === "number" ? p.number : undefined,
      club: typeof p.club === "string" ? p.club : undefined,
    });
  }
  return players;
}

/** Loads squad from Zafronix /teams/{name}/roster when WC2026 photos are unavailable. */
export function useZafronixTeamRoster(
  team: Team | null | undefined,
  enabled = true
): {
  players: ZafronixRosterPlayer[];
  loading: boolean;
} {
  const [players, setPlayers] = useState<ZafronixRosterPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !team?.name) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchTeamRoster(team.name, 2026).then((raw) => {
      if (cancelled) return;
      setPlayers(normalizeRoster(raw));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, team?.id, team?.name]);

  return { players, loading };
}
