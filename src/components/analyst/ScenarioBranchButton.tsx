import { GitBranch } from "lucide-react";
import { useStore } from "../../store";

interface Props {
  groupId: string;
  matchId?: string;
}

export function ScenarioBranchButton({ groupId, matchId }: Props) {
  const setActiveScenario = useStore((s) => s.setActiveScenario);
  const setActiveTab = useStore((s) => s.setActiveTab);

  function handleClick() {
    const scenarioId = `local-${Date.now()}`;
    setActiveScenario(scenarioId, `group-${groupId}`);
    setActiveTab("simulator");
    if (matchId) {
      useStore.getState().addOverride({ matchId, homeScore: 1, awayScore: 0 });
    }
  }

  return (
    <button type="button" className="scenario-branch-btn" onClick={handleClick}>
      <GitBranch size={14} aria-hidden />
      Branch from here
    </button>
  );
}
