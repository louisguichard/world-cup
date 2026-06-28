import { TrendingUp } from "lucide-react";
import type { GroupLetter } from "../../types";
import { ProbabilityBar } from "./ProbabilityBar";
import { FactorContributionBar } from "./FactorContributionBar";
import { ProvenanceTooltip } from "./ProvenanceTooltip";

export type PredictionTeamRow = {
  teamId: string;
  teamName: string;
  probability: number;
  baseline?: number;
  factors?: Array<{ factor: string; contribution: number }>;
};

interface Props {
  groupId: GroupLetter;
  rows: PredictionTeamRow[];
  modelVersion?: string;
}

/**
 * BC3 prediction panel — separate visual region from OfficialQualificationPanel.
 */
export function AdvancementProbabilityPanel({
  groupId,
  rows,
  modelVersion = "1.0",
}: Props) {
  return (
    <section
      className="analyst-panel analyst-panel--prediction"
      aria-labelledby={`prediction-qual-${groupId}`}
      data-testid="advancement-probability-panel"
    >
      <header className="analyst-panel__header">
        <TrendingUp size={16} aria-hidden className="analyst-panel__icon" />
        <div>
          <h2 id={`prediction-qual-${groupId}`} className="analyst-panel__title">
            Prediction Engine
          </h2>
          <p className="analyst-panel__subtitle">Advancement probability · model v{modelVersion}</p>
        </div>
        <ProvenanceTooltip
          providerId="model"
          authority="COMPUTED"
          field="advancement.probability"
          ingestedAt={new Date().toISOString()}
        />
      </header>
      <ul className="analyst-panel__list">
        {rows.map((row) => (
          <li key={row.teamId} className="analyst-panel__row analyst-panel__row--stacked">
            <div className="analyst-panel__row-head">
              <span className="analyst-panel__team">{row.teamName}</span>
              <span className="analyst-panel__pct">{Math.round(row.probability * 100)}%</span>
            </div>
            <ProbabilityBar
              value={row.probability}
              baseline={row.baseline}
              label={`${row.teamName} advancement probability`}
            />
            {row.factors && row.factors.length > 0 ? (
              <FactorContributionBar factors={row.factors} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
