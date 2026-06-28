import type { GroupLetter } from "../../types";
import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import { useStore } from "../../store";
import { teamDisplayName } from "../../lib/teamIdentity";
import { useGroupOfficialQualification } from "../../hooks/useGroupOfficialQualification";
import { OfficialQualificationPanel } from "../analyst/OfficialQualificationPanel";

type Props = {
  groupId: GroupLetter;
};

export function GroupOfficialQualificationSection({ groupId }: Props) {
  const teams = useStore((s) => s.teams);
  const { rows, loading, error, engineVersion, source } = useGroupOfficialQualification(groupId);

  if (loading) {
    return (
      <p className="analyst-panel analyst-panel--official analyst-panel--loading" data-testid="official-qual-loading">
        Loading official engine…
      </p>
    );
  }

  if (error || rows.length === 0) {
    return null;
  }

  const panelRows = rows.map((row) => {
    const team = resolveTeamFromStore(teams, row.teamId);
    return {
      teamId: row.teamId,
      teamName: teamDisplayName(team, row.teamId),
      status: row.status,
    };
  });

  return (
    <div data-official-source={source ?? "unknown"}>
      <OfficialQualificationPanel
        groupId={groupId}
        rows={panelRows}
        engineVersion={engineVersion}
      />
    </div>
  );
}
