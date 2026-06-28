import { useEffect, useState } from "react";
import type { GroupLetter, QualificationStatus } from "../types";
import { resolveQualificationDisplay } from "../lib/qualificationDisplay";

export type OfficialQualificationApiTeam = {
  teamId: string;
  tier: string;
  certainty: string;
  lifeState: string;
  projectionScore: number | null;
  reasons: string[];
  engineVersion: string;
};

export type OfficialQualificationApiResponse = {
  groupId: string;
  asOf: string;
  source: "snapshot" | "computed";
  teams: OfficialQualificationApiTeam[];
};

function mapApiTierToStatus(team: OfficialQualificationApiTeam): QualificationStatus {
  let status: QualificationStatus["status"] = "pending";
  if (team.tier === "CHAMPION" || team.tier === "RUNNER_UP" || team.tier === "QUALIFIED_TOP2") {
    status = "qualified";
  } else if (team.tier === "ELIMINATED") {
    status = "eliminated";
  } else if (team.tier === "THIRD" || team.tier === "BEST_THIRD") {
    status = "at_risk";
  }

  const certaintyMap: Record<string, QualificationStatus["certainty"]> = {
    CONFIRMED: "confirmed",
    LIKELY: "projected_strong",
    POSSIBLE: "projected_weak",
    UNCERTAIN: "projected",
  };

  const lifeStateMap: Record<string, QualificationStatus["lifeState"]> = {
    ALIVE: "alive",
    ELIMINATED: "eliminated",
  };

  return {
    status,
    certainty: certaintyMap[team.certainty] ?? "projected",
    lifeState: lifeStateMap[team.lifeState] ?? "alive",
    canQualify: team.lifeState !== "ELIMINATED",
    projectionScore: team.projectionScore ?? 0,
    reason: team.reasons[0],
  };
}

export function useGroupOfficialQualification(groupId: GroupLetter) {
  const [data, setData] = useState<OfficialQualificationApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/qualification/${encodeURIComponent(groupId)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<OfficialQualificationApiResponse>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load official qualification");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const rows = (data?.teams ?? []).map((team) => ({
    teamId: team.teamId,
    status: mapApiTierToStatus(team),
    display: resolveQualificationDisplay(mapApiTierToStatus(team)),
  }));

  return {
    data,
    rows,
    loading,
    error,
    engineVersion: data?.teams[0]?.engineVersion ?? "2.0",
    source: data?.source,
  };
}
