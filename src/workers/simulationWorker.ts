import type { ConfirmedFixture, Match, PolymarketMatchMarket, Team, TournamentSimulationResult } from "../types";
import { simulateTournamentOutcomes } from "../lib/tournament";

type SimulationRequest = {
  requestId: number;
  teams: Team[];
  matches: Match[];
  knockoutMarkets: PolymarketMatchMarket[];
  knockoutFixtures: ConfirmedFixture[];
  iterations: number;
  seed: number;
};

type SimulationResponse = {
  requestId: number;
  result?: TournamentSimulationResult;
  error?: string;
};

self.onmessage = (event: MessageEvent<SimulationRequest>) => {
  const { requestId, teams, matches, knockoutMarkets, knockoutFixtures, iterations, seed } = event.data;

  try {
    const result = simulateTournamentOutcomes(teams, matches, knockoutMarkets, iterations, seed, knockoutFixtures);
    self.postMessage({ requestId, result } satisfies SimulationResponse);
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : "Simulation failed"
    } satisfies SimulationResponse);
  }
};

export {};
