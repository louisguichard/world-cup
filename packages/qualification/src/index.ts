/**
 * @wc2026/qualification — BC2 pure deterministic qualification engine.
 * Re-exports from existing client implementation (promoted unchanged per migration plan).
 */

export {
  buildQualificationContext,
  computeQualificationStatus,
  deriveStandings,
  deriveStandingsIfScored,
  expectedMatchesPerTeam,
  matchesInGroup,
  standingsEqual,
} from "../../../src/lib/qualification.js";

export { rankAliveBestThirds, thirdPlaceRankAmongAlive } from "../../../src/lib/thirdPlaceQualification.js";

export { QUALIFICATION_ENGINE_VERSION } from "./engineVersion.js";

export { computeInputHash } from "./inputHash.js";
