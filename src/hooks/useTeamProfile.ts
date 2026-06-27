import { useEffect, useState } from "react";
import type { TeamProfileBundle } from "../types/teamProfile";
import { useStore } from "../store";
import { syncSingleTeamProfile } from "../services/teamProfile/TeamProfileSync";

export function useTeamProfile(abbrev: string | undefined): {
  profile: TeamProfileBundle | null;
  loading: boolean;
} {
  const profiles = useStore((s) => s.teamProfiles);
  const setTeamProfile = useStore((s) => s.setTeamProfile);
  const key = abbrev?.toUpperCase() ?? "";
  const cached = key ? profiles[key] ?? null : null;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!key) return;
    if (cached) return;

    let cancelled = false;
    setLoading(true);
    void syncSingleTeamProfile(key).then((profile) => {
      if (cancelled) return;
      if (profile) setTeamProfile(profile);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [key, cached, setTeamProfile]);

  return { profile: cached, loading: loading && !cached };
}
