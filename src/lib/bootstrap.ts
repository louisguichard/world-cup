import { DataOrchestrator } from "../services/orchestrator/DataOrchestrator";

/** App bootstrap — delegates to DataOrchestrator. */
export async function bootstrap(): Promise<void> {
  await DataOrchestrator.getInstance().boot();
}
