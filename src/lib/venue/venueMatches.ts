import { getBroadcast } from "../../services/BroadcastLookup";
import { normalizeStadiumName } from "../../data/venues/venueAliases";
import type { MergedMatch } from "../../types";
import type { VenueMatchSlice } from "./types";

function stadiumNameForMatch(match: MergedMatch): string | null {
  const matchId = match.matchId ?? match.id;
  const broadcast = matchId ? getBroadcast(matchId) : undefined;
  if (broadcast?.venue.name) return normalizeStadiumName(broadcast.venue.name);

  if (match.venue) {
    const part = match.venue.split(",")[0]?.trim();
    if (part) return normalizeStadiumName(part);
  }

  return null;
}

export function filterMatchesByStadium(
  matches: MergedMatch[],
  stadiumName: string
): MergedMatch[] {
  const canonical = normalizeStadiumName(stadiumName);
  return matches.filter((m) => stadiumNameForMatch(m) === canonical);
}

function isPast(match: MergedMatch, now = Date.now()): boolean {
  return match.status === "completed" || match.locked || Date.parse(match.date) < now;
}

function isUpcoming(match: MergedMatch, now = Date.now()): boolean {
  return match.status === "scheduled" || match.status === "live" || Date.parse(match.date) >= now;
}

export function getMostRecentAtVenue(
  matches: MergedMatch[],
  stadiumName: string,
  now = Date.now()
): MergedMatch | null {
  const atVenue = filterMatchesByStadium(matches, stadiumName)
    .filter((m) => isPast(m, now))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return atVenue[0] ?? null;
}

export function getNextUpcomingAtVenue(
  matches: MergedMatch[],
  stadiumName: string,
  now = Date.now()
): MergedMatch | null {
  const atVenue = filterMatchesByStadium(matches, stadiumName)
    .filter((m) => isUpcoming(m, now) && m.status !== "completed" && !m.locked)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return atVenue[0] ?? null;
}

export function getTimelinePreview(
  matches: MergedMatch[],
  stadiumName: string,
  windowSize = 6,
  now = Date.now()
): MergedMatch[] {
  const atVenue = filterMatchesByStadium(matches, stadiumName).sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date)
  );
  if (atVenue.length === 0) return [];

  const upcomingIdx = atVenue.findIndex(
    (m) => m.status === "scheduled" || m.status === "live" || Date.parse(m.date) >= now
  );
  const pivot = upcomingIdx >= 0 ? upcomingIdx : atVenue.length - 1;
  const half = Math.floor(windowSize / 2);
  const start = Math.max(0, pivot - half);
  const end = Math.min(atVenue.length, start + windowSize);
  return atVenue.slice(start, end);
}

export function getPastMatchesAtVenue(
  matches: MergedMatch[],
  stadiumName: string,
  now = Date.now()
): MergedMatch[] {
  return filterMatchesByStadium(matches, stadiumName)
    .filter((m) => isPast(m, now))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function getFutureMatchesAtVenue(
  matches: MergedMatch[],
  stadiumName: string,
  now = Date.now()
): MergedMatch[] {
  return filterMatchesByStadium(matches, stadiumName)
    .filter((m) => isUpcoming(m, now) && m.status !== "completed" && !m.locked)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function buildVenueMatchSlice(
  matches: MergedMatch[],
  stadiumName: string,
  now = Date.now()
): VenueMatchSlice {
  return {
    recent: getMostRecentAtVenue(matches, stadiumName, now),
    upcoming: getNextUpcomingAtVenue(matches, stadiumName, now),
    timeline: getTimelinePreview(matches, stadiumName, 6, now),
    past: getPastMatchesAtVenue(matches, stadiumName, now),
    future: getFutureMatchesAtVenue(matches, stadiumName, now)
  };
}
