import { useStore } from "../../store";
import { MatchOverrideCard } from "./MatchOverrideCard";
import { AdvancementProbabilityPanel } from "./AdvancementProbabilityPanel";
import { FactorContributionPanel } from "./FactorContributionPanel";
import { ScenarioMetaBar } from "./ScenarioMetaBar";
import { BaselineComparison } from "./BaselineComparison";
import { ScenarioBaseChangedBanner } from "../providers/SSEProvider";

/**
 * Three-pane analyst scenario workspace (Prompt 5).
 */
export function ScenarioWorkspace() {
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const overrides = useStore((s) => s.overrides);
  const result = useStore((s) => s.result);
  const status = useStore((s) => s.status);
  const liveMatches = useStore((s) => s.liveMatches);

  const upcoming = Object.values(liveMatches)
    .filter((m) => m.status === "scheduled" || m.status === "live")
    .slice(0, 8);

  if (!activeScenarioId) {
    return (
      <div className="scenario-workspace scenario-workspace--empty">
        <p>No active scenario. Use &ldquo;Branch from here&rdquo; on a group or match.</p>
      </div>
    );
  }

  const predictionRows = Object.entries(result?.advancementProbabilities ?? {}).map(
    ([teamId, probability]) => ({
      teamId,
      teamName: teamId,
      probability,
    })
  );

  return (
    <div className="scenario-workspace">
      <ScenarioBaseChangedBanner />
      <div className="scenario-workspace__panes">
        <section className="scenario-pane scenario-pane--overrides" aria-label="Overrides">
          <h2>Overrides</h2>
          {upcoming.map((m) => (
            <MatchOverrideCard
              key={m.id}
              matchId={m.id}
              homeTeam={m.homeTeamId}
              awayTeam={m.awayTeamId}
            />
          ))}
          {overrides.length === 0 ? <p className="muted">No overrides applied yet.</p> : null}
        </section>

        <section className="scenario-pane scenario-pane--probability" aria-label="Live probability">
          <h2>Live Probability</h2>
          <AdvancementProbabilityPanel groupId="A" rows={predictionRows} />
          {status === "computing" ? <p>Running simulation…</p> : null}
        </section>

        <section className="scenario-pane scenario-pane--explain" aria-label="Explainability">
          <h2>Explainability</h2>
          <BaselineComparison />
          <FactorContributionPanel overrides={overrides} />
        </section>
      </div>
      <ScenarioMetaBar scenarioId={activeScenarioId} status={status} result={result} />
    </div>
  );
}
