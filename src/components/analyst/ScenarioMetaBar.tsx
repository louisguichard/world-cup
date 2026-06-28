import type { ScenarioResult, ScenarioStatus } from "../../store/slices/scenarioSlice";
import { useStore } from "../../store";

interface Props {
  scenarioId: string;
  status: ScenarioStatus;
  result: ScenarioResult | null;
}

export function ScenarioMetaBar({ scenarioId, status, result }: Props) {
  const setScenarioStatus = useStore((s) => s.setScenarioStatus);
  const setScenarioResult = useStore((s) => s.setScenarioResult);
  const overrides = useStore((s) => s.overrides);

  async function runSimulation() {
    setScenarioStatus("computing");
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analystId: "local-analyst",
          baseSnapshotId: scenarioId,
          overrides,
        }),
      });
      if (!res.ok) throw new Error("Simulation request failed");
      const workspace = (await res.json()) as { id: string };
      const resultRes = await fetch(`/api/scenarios/${encodeURIComponent(workspace.id)}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iterations: 500 }),
      });
      if (!resultRes.ok) throw new Error("Simulation failed");
      const sim = (await resultRes.json()) as ScenarioResult;
      setScenarioResult(sim);
    } catch {
      setScenarioStatus("error", "Backend unavailable — using local fallback");
      setScenarioResult({
        scenarioId,
        seed: Date.now(),
        iterationsRun: 500,
        advancementProbabilities: {},
        completedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <footer className="scenario-meta-bar">
      <span>Scenario {scenarioId.slice(0, 12)}…</span>
      <span>Status: {status}</span>
      {result ? (
        <span>
          Seed {result.seed} · {result.iterationsRun} iterations
        </span>
      ) : null}
      <button type="button" className="btn-primary btn-sm" onClick={() => void runSimulation()}>
        Run simulation
      </button>
    </footer>
  );
}
