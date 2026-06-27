import { useCallback } from "react";
import type { OpenTeamSheetOptions } from "../lib/teamDrawer";
import { useStore } from "../store";

export function useOpenTeam() {
  const openTeamSheet = useStore((s) => s.openTeamSheet);

  const openTeam = useCallback(
    (teamId: string, options?: OpenTeamSheetOptions) => {
      openTeamSheet(teamId, options);
    },
    [openTeamSheet]
  );

  return { openTeam, openTeamSheet };
}
