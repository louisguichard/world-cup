import { useEffect, useState } from "react";
import { readTournamentProfile } from "../lib/teamProfileCache";
import type { TournamentProfileBundle } from "../types/teamProfile";

export function useTournamentProfile(): TournamentProfileBundle | null {
  const [profile, setProfile] = useState<TournamentProfileBundle | null>(() => readTournamentProfile());

  useEffect(() => {
    setProfile(readTournamentProfile());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wc-tournament-profile-v1") {
        setProfile(readTournamentProfile());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return profile;
}
