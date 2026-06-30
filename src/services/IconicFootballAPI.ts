/** @deprecated Import from `./iconicFootball/IconicFootballClient` instead. */
export type {
  IconicFootballPlayer,
  IconicPlayerCareer,
} from "./iconicFootball/types";

export {
  fetchIconicPlayers,
  fetchIconicPlayerRefs,
  getHeadToHeadFromPlayerProfiles,
  getHistoricalMatchData,
  getPlayerCareer,
  lookupIconicPlayerPhoto,
  lookupIconicPlayerPhotoAsync,
  warmIconicFootballIndex,
} from "./iconicFootball/IconicFootballClient";

export { readSessionCache, writeSessionCache } from "./iconicFootball/sessionCache";
