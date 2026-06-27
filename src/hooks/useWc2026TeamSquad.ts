import { useEffect, useState } from "react";
import type { Team } from "../types";
import {
  fetchTeamPlayers,
  getWc2026TeamIdFromCache,
  resolveWc2026TeamId,
  type Wc2026Player,
} from "../services/WorldCup2026Client";

export function useWc2026TeamSquad(team: Team | null | undefined): {
  players: Wc2026Player[];
  loading: boolean;
} {
  const [players, setPlayers] = useState<Wc2026Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!team) {
      setPlayers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const wcId =
        team.wc2026TeamId ??
        getWc2026TeamIdFromCache(team.abbreviation) ??
        (await resolveWc2026TeamId(team.abbreviation));

      if (!wcId) {
        if (!cancelled) {
          setPlayers([]);
          setLoading(false);
        }
        return;
      }

      const roster = await fetchTeamPlayers(wcId);
      if (!cancelled) {
        setPlayers(roster);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [team?.id, team?.abbreviation, team?.wc2026TeamId]);

  return { players, loading };
}
