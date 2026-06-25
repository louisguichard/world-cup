import { useStore } from "../store";
import { simulateTournamentOutcomes } from "../lib/tournament";
import { logger } from "./Logger";
import type { Match, PolymarketMatchMarket, Team, TournamentSimulationResult } from "../types";

const DEBOUNCE_MS = 2_000;
const WORKER_ITERATIONS = 10_000;
const MAX_MAIN_THREAD = 4_200;
const WORKER_TIMEOUT_MS = 45_000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let workerRequestId = 0;

function runSimulationInWorker(
  teams: Team[],
  matches: Match[],
  knockoutMarkets: PolymarketMatchMarket[],
  iterations: number,
  seed: number
): Promise<TournamentSimulationResult> {
  return new Promise((resolve, reject) => {
    const requestId = ++workerRequestId;
    const worker = new Worker(new URL("../workers/simulationWorker.ts", import.meta.url), {
      type: "module"
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("Simulation timed out after 45s"));
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<{ requestId: number; result?: TournamentSimulationResult; error?: string }>) => {
      if (event.data.requestId !== requestId) return;
      clearTimeout(timeout);
      worker.terminate();
      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }
      if (!event.data.result) {
        reject(new Error("Simulation returned no result"));
        return;
      }
      resolve(event.data.result);
    };

    worker.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error("Simulation worker crashed"));
    };

    worker.postMessage({ requestId, teams, matches, knockoutMarkets, iterations, seed });
  });
}

export function scheduleSimulation(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void runCalibration(), DEBOUNCE_MS);
}

export async function runCalibration(): Promise<void> {
  const store = useStore.getState();
  store.setSimulationRunning(true);

  try {
    const teams = Object.values(store.teams);
    if (teams.length === 0) {
      throw new Error("Simulation requires team data");
    }

    const groupMatches = Object.values(store.liveMatches).filter(
      (match): match is Match & { group: NonNullable<Match["group"]> } => Boolean(match.group)
    );

    if (groupMatches.length === 0) {
      throw new Error("Simulation requires group-stage matches");
    }

    const useWorker = typeof Worker !== "undefined";
    const iterations = useWorker ? WORKER_ITERATIONS : MAX_MAIN_THREAD;

    const result = useWorker
      ? await runSimulationInWorker(teams, groupMatches, store.knockoutMarkets, iterations, store.simulationSeed)
      : simulateTournamentOutcomes(
          teams,
          groupMatches,
          store.knockoutMarkets,
          iterations,
          store.simulationSeed
        );

    if (!result.championOdds.length) {
      throw new Error("Simulation produced no champion odds");
    }

    store.setSimulationResult(result);
    logger.info("Simulation complete", "SimulationScheduler", {
      iterations,
      groupMatches: groupMatches.length,
      teams: teams.length,
      worker: useWorker
    });
  } catch (error) {
    logger.error("Simulation failed", "SimulationScheduler", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    store.setSimulationRunning(false);
  }
}
