import { Shield } from "lucide-react";
import type { GroupLetter, QualificationStatus } from "../../types";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { ProvenanceTooltip } from "./ProvenanceTooltip";

export type OfficialTeamRow = {
  teamId: string;
  teamName: string;
  status: QualificationStatus;
};

interface Props {
  groupId: GroupLetter;
  rows: OfficialTeamRow[];
  engineVersion?: string;
}

/**
 * BC2 official qualification panel — visually distinct from prediction panel.
 * Must never share a container with AdvancementProbabilityPanel.
 */
export function OfficialQualificationPanel({ groupId, rows, engineVersion = "2.0" }: Props) {
  return (
    <section
      className="analyst-panel analyst-panel--official"
      aria-labelledby={`official-qual-${groupId}`}
      data-testid="official-qualification-panel"
    >
      <header className="analyst-panel__header">
        <Shield size={16} aria-hidden className="analyst-panel__icon" />
        <div>
          <h2 id={`official-qual-${groupId}`} className="analyst-panel__title">
            Official Engine
          </h2>
          <p className="analyst-panel__subtitle">Deterministic qualification · v{engineVersion}</p>
        </div>
      </header>
      <ul className="analyst-panel__list">
        {rows.map((row) => (
          <li key={row.teamId} className="analyst-panel__row">
            <span className="analyst-panel__team">{row.teamName}</span>
            <QualificationStatusBadge qual={row.status} />
            <ProvenanceTooltip
              providerId="fifa"
              authority="PRIMARY"
              field="qualification.tier"
              ingestedAt={new Date().toISOString()}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
