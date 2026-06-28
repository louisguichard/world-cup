/**
 * @wc2026/prediction — BC3 probabilistic forecast engine.
 * Re-exports existing models; factor attribution wrapper is additive (does not change core).
 */

export {
  buildPrediction,
  ratingProbabilities,
  normalizeProbabilities,
  makeFallbackPrediction,
} from "../../../src/lib/predictions.js";

export { computeStandings } from "../../../src/lib/tournament.js";

export { PREDICTION_ENGINE_VERSION } from "./engineVersion.js";

export { computeFactorContributions } from "./factorContributions.js";

export { simulateTournament } from "./simulateTournament.js";

export type { SimulationInput, SimulationResult } from "./simulateTournament.js";
