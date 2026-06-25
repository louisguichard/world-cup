import { useEffect, useRef } from "react";
import { computeQualificationStatus } from "../lib/qualification";
import { logger } from "../services/Logger";
import { useStore } from "../store";
import type { QualificationStatus } from "../types";

export function useQualificationChangeLogger(): void {
  const previousStatuses = useRef<Record<string, QualificationStatus>>({});
  const teams = useStore((s) => s.teams);
  const groupStandings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);

  useEffect(() => {
    for (const teamId of Object.keys(teams)) {
      const current = computeQualificationStatus(teamId, groupStandings, 3);
      const previous = previousStatuses.current[teamId];

      if (previous && previous.status !== current.status) {
        logger.info("Qualification status changed", "QualificationChangeLogger", {
          teamId,
          teamName: teams[teamId]?.shortName ?? teamId,
          from: previous.status,
          to: current.status,
          liveMatchCount: Object.values(liveMatches).filter((m) => m.status === "live").length
        });

        window.__lastQualificationChange = {
          teamId,
          from: previous.status,
          to: current.status,
          at: Date.now()
        };
      }

      previousStatuses.current[teamId] = current;
    }
  }, [liveMatches, teams, groupStandings]);
}
