import type { MergedMatch } from "../types";
import type { SofaEvent } from "./SofaScore6Client";

export {
  SOFASCORE6_WC_CATEGORY_ID as SPORTAPI_WC_CATEGORY_ID,
  mapSofaScore6EventToSofaEvent as mapSportApiEventToSofaEvent,
  fetchScheduledToday,
  fetchIncidents,
  fetchScheduledEvents,
  fetchLiveEvents,
  isSportAPI7Disabled,
  resetSportAPI7SessionForTests,
} from "./SofaScore6Client";

export type { SofaEvent };
