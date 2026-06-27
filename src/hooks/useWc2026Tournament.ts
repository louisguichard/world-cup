import { useEffect, useState } from "react";
import { fetchTournamentInfo, getCachedTournamentInfo, type Wc2026Tournament } from "../services/WorldCup2026Client";

export function useWc2026Tournament(): Wc2026Tournament | null {
  const [info, setInfo] = useState<Wc2026Tournament | null>(() => getCachedTournamentInfo());

  useEffect(() => {
    if (info) return;
    void fetchTournamentInfo().then((t) => {
      if (t) setInfo(t);
    });
  }, [info]);

  return info;
}
