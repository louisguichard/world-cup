import type { MergedMatch, Team } from "../types";

export type { SofaEvent } from "./SofaScore6Client";

export {
  fetchScheduledToday,
  fetchIncidents,
  fetchLiveEvents,
  fetchEventDetail,
  fetchTeamDetails,
  isSofaScoreDisabled,
  resetSofaScoreSessionForTests,
  SOFA_CONDUCT_MAP,
  mergeConductScores,
} from "./SofaScore6Client";
