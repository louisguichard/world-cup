import { useEffect, useMemo, useRef } from "react";
import { resolveTeamFromStore, uniqueCanonicalTeamIds } from "../data/wc2026TeamCatalog";
import { buildQualificationContext, computeQualificationStatus } from "../lib/qualification";
import { logger } from "../services/Logger";
import { useStore } from "../store";
import type { QualificationStatus } from "../types";

export function useQualificationChangeLogger(): void {
  const previousStatuses = useRef<Record<string, QualificationStatus>>({});
  const teams = useStore((s) => s.teams);
  const groupStandings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  useEffect(() => {
    for (const teamId of uniqueCanonicalTeamIds(teams)) {
      const current = computeQualificationStatus(teamId, groupStandings, qualContext);
      const previous = previousStatuses.current[teamId];

      if (previous && previous.status !== current.status) {
        const liveGroup = Object.values(useStore.getState().liveMatches).filter(
          (m) => m.status === "live" && m.group
        ).length;
        logger.info("Qualification status changed", "QualificationChangeLogger", {
          teamId,
          teamName: resolveTeamFromStore(teams, teamId)?.shortName ?? teamId,
          from: previous.status,
          to: current.status,
          liveMatchCount: liveGroup
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
  }, [teams, groupStandings, qualContext]);
}
