import type { MergedMatch } from "../../types";
import type { FifaPublicLiveMatch, FifaPublicMatch } from "../../schemas/fifaPublic";
import { mapExternalStatus, parseScoreValue, toUtcIso } from "./normalizeStatus";

function mapFifaStatus(status: string | undefined): MergedMatch["status"] | undefined {
  if (!status) return undefined;
  if (status === "finished") return "completed";
  if (status === "notStarted") return "scheduled";
  return mapExternalStatus(status);
}

/** Maps FIFA public API match row to partial MergedMatch keyed by M{matchNumber}. */
export function normalizeFifaPublicMatch(raw: FifaPublicMatch): Partial<MergedMatch> {
  const partial: Partial<MergedMatch> = {};

  if (raw.matchNumber != null && Number.isFinite(raw.matchNumber)) {
    const storeId = `M${raw.matchNumber}`;
    partial.id = storeId;
    partial.matchId = storeId;
  }

  if (raw.idMatch) partial.fifaMatchId = raw.idMatch;

  const homeScore = parseScoreValue(raw.homeScore);
  const awayScore = parseScoreValue(raw.awayScore);
  if (homeScore !== undefined) partial.homeScore = homeScore;
  if (awayScore !== undefined) partial.awayScore = awayScore;

  const status = mapFifaStatus(raw.status);
  if (status) partial.status = status;

  const date = toUtcIso(raw.dateUtc);
  if (date) partial.date = date;

  return partial;
}

/** Maps FIFA live endpoint row (with nested live detail) to partial MergedMatch. */
export function normalizeFifaPublicLiveMatch(raw: FifaPublicLiveMatch): Partial<MergedMatch> {
  const partial = normalizeFifaPublicMatch(raw);

  const liveScoreHome = parseScoreValue(raw.live?.score?.home);
  const liveScoreAway = parseScoreValue(raw.live?.score?.away);
  if (liveScoreHome !== undefined) partial.homeScore = liveScoreHome;
  if (liveScoreAway !== undefined) partial.awayScore = liveScoreAway;

  const liveStatus = mapFifaStatus(raw.live?.status ?? raw.status);
  if (liveStatus) partial.status = liveStatus;

  return partial;
}
