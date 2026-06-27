import { DataOrchestrator } from "../services/orchestrator/DataOrchestrator";
import { useStore } from "../store";
import { MODULE_IDS, type ModuleId } from "./moduleIds";

export async function refreshModule(moduleId: ModuleId): Promise<void> {
  const orchestrator = DataOrchestrator.getInstance();
  const store = useStore.getState();

  switch (moduleId) {
    case MODULE_IDS.liveMatches:
    case MODULE_IDS.recentResults:
    case MODULE_IDS.schedule:
      await orchestrator.tickLive();
      break;
    case MODULE_IDS.groupStandings:
    case MODULE_IDS.bestThird:
    case MODULE_IDS.qualification:
      await orchestrator.refreshStandings();
      break;
    case MODULE_IDS.bracket:
      await orchestrator.refreshBracket();
      await orchestrator.refreshStandings();
      break;
    default: {
      const _exhaustive: never = moduleId;
      return _exhaustive;
    }
  }

  store.touchModuleFreshness(moduleId);
}
