import type { GroupLetter, GroupStanding } from "../types";
import { resolveTeamFromStore } from "../data/wc2026TeamCatalog";
import { buildQualificationContext, computeQualificationStatus } from "../lib/qualification";
import { teamDisplayName } from "../lib/teamIdentity";
import { useStore } from "../store";
import {
  AdvancementProbabilityPanel,
  type PredictionTeamRow,
} from "../analyst/AdvancementProbabilityPanel";

type Props = {
  groupId: GroupLetter;
  standing: GroupStanding;
  standings: GroupStanding[];
  qualContext: ReturnType<typeof buildQualificationContext>;
};

/**
 * BC3 prediction region — separate from official qualification panel.
 * Uses SSE/store probabilities when present; falls back to engine projectionScore.
 */
export function GroupAdvancementProbabilitySection({
  groupId,
  standing,
  standings,
  qualContext,
}: Props) {
  const teams = useStore((s) => s.teams);
  const advancementProbabilities = useStore((s) => s.advancementProbabilities);
  const modelVersion = useStore((s) => s.modelVersion);

  const rows: PredictionTeamRow[] = standing.rows.map((row) => {
    const team = resolveTeamFromStore(teams, row.teamId);
    const qual = computeQualificationStatus(row.teamId, standings, qualContext);
    const storeKey = `${row.teamId}:ROUND_OF_32`;
    const fromStore = advancementProbabilities[storeKey];
    const probability =
      fromStore?.probability ??
      (qual.canQualify ? Math.min(1, Math.max(0, qual.projectionScore / 100)) : 0);

    return {
      teamId: row.teamId,
      teamName: teamDisplayName(team, row.teamId),
      probability,
      baseline: qual.projectionScore / 100,
    };
  });

  if (rows.every((row) => row.probability <= 0)) {
    return null;
  }

  return (
    <AdvancementProbabilityPanel groupId={groupId} rows={rows} modelVersion={modelVersion} />
  );
}
