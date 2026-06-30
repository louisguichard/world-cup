import { buildQualificationContext, type QualificationMatchContext } from "./qualification";
import { buildScheduleOverlayFingerprint } from "../store/selectors/scheduleSelectors";
import { useStore } from "../store";

let cachedFingerprint = "";
let cachedContext: QualificationMatchContext | null = null;

/** One qualification context per overlay fingerprint — shared by all bentos/cards. */
export function getQualificationContext(): QualificationMatchContext {
  const { liveMatches, teams, groupStandings } = useStore.getState();
  const fingerprint = buildScheduleOverlayFingerprint(liveMatches, groupStandings);
  if (fingerprint === cachedFingerprint && cachedContext) {
    return cachedContext;
  }

  cachedContext = buildQualificationContext(Object.values(liveMatches), Object.values(teams));
  cachedFingerprint = fingerprint;
  return cachedContext;
}

/** Test-only reset. */
export function resetQualificationContextCache(): void {
  cachedFingerprint = "";
  cachedContext = null;
}
