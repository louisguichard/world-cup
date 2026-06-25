import scheduleData from "../data/matchSchedule.json";
import { normalizeKickoffUtc } from "../lib/normalize";
import type { BroadcastChip, MatchScheduleEntry } from "../types";

const entries = (scheduleData as { matches: MatchScheduleEntry[] }).matches;

function parseStreaming(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[·•,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeNetwork(raw: string): string {
  if (raw.includes("FS1")) return "FS1";
  if (raw.toUpperCase().includes("FOX")) return "FOX";
  if (raw.toLowerCase().includes("universo")) return "Universo";
  if (raw.toLowerCase().includes("telemundo")) return "Telemundo";
  return raw.split("(")[0]?.trim() ?? raw;
}

export function buildBroadcastIndex(matches: MatchScheduleEntry[]): Record<string, BroadcastChip> {
  const index: Record<string, BroadcastChip> = {};

  for (const match of matches) {
    const matchId = `M${match.matchNumber}`;
    const usa = match.broadcast?.USA;
    const english = usa?.english;
    const spanish = usa?.spanish;
    const streaming = [
      ...parseStreaming(english?.streaming),
      ...parseStreaming(spanish?.streaming)
    ];

    index[matchId] = {
      matchId,
      kickoffUTC: match.kickoff.utc,
      englishNetwork: normalizeNetwork(english?.network ?? ""),
      spanishNetwork: normalizeNetwork(spanish?.network ?? ""),
      streaming: [...new Set(streaming)],
      isConcurrent: Boolean(usa?.concurrentMatchNote),
      venue: {
        name: match.venue.name,
        city: match.venue.city,
        country: match.venue.country
      }
    };
  }

  return index;
}

const broadcastIndex = buildBroadcastIndex(entries);

const kickoffToMatchId: Record<string, string> = {};
for (const match of entries) {
  kickoffToMatchId[normalizeKickoffUtc(match.kickoff.utc)] = `M${match.matchNumber}`;
}

export function getBroadcast(matchId: string): BroadcastChip | undefined {
  return broadcastIndex[matchId];
}

export function getAllScheduleEntries(): MatchScheduleEntry[] {
  return entries;
}

export function getBroadcastByKickoff(kickoffUtc: string): BroadcastChip | undefined {
  const matchId = kickoffToMatchId[normalizeKickoffUtc(kickoffUtc)];
  return matchId ? broadcastIndex[matchId] : undefined;
}

export { broadcastIndex };
