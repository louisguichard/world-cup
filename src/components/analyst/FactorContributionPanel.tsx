import { useState } from "react";
import type { MatchOverride } from "../../store/slices/scenarioSlice";

interface Props {
  overrides: MatchOverride[];
}

export function FactorContributionPanel({ overrides }: Props) {
  if (overrides.length === 0) {
    return <p className="muted">Apply an override to see factor decomposition.</p>;
  }

  return (
    <div className="factor-contribution-panel">
      <h3>What changed</h3>
      <ul>
        {overrides.map((o) => (
          <li key={o.matchId}>
            Match {o.matchId}: score set to {o.homeScore}-{o.awayScore}
            <span className="factor-contribution-panel__impact"> scenario_overrides +40%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
