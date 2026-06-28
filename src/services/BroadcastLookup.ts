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

const ENGLISH_PRIORITY = ["FOX", "FS1", "FS2", "Peacock", "TNT", "TBS"] as const;
const SPANISH_PRIORITY = ["Telemundo", "Universo", "TUDN"] as const;

export type PrimaryBroadcast = {
  english: string;
  spanish: string;
  streamingNote?: string;
  isConcurrent: boolean;
};

function normalizeEnglish(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper.includes("FS2")) return "FS2";
  if (upper.includes("FS1")) return "FS1";
  if (upper.includes("PEACOCK")) return "Peacock";
  if (upper.includes("TNT")) return "TNT";
  if (upper.includes("TBS")) return "TBS";
  if (upper.includes("FOX")) return "FOX";
  return raw.split("(")[0]?.trim() ?? raw;
}

function normalizeSpanish(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("tudn")) return "TUDN";
  if (lower.includes("universo")) return "Universo";
  if (lower.includes("telemundo")) return "Telemundo";
  return raw.split("(")[0]?.trim() ?? raw;
}

function normalizeNetwork(raw: string): string {
  return normalizeEnglish(raw);
}

function pickFromPriority(candidates: string[], priority: readonly string[]): string {
  for (const label of priority) {
    const hit = candidates.find((c) => c.toUpperCase().includes(label.toUpperCase()));
    if (hit) return label;
  }
  return candidates[0] ?? "";
}

export function getPrimaryBroadcast(matchId?: string, kickoff?: string): PrimaryBroadcast | undefined {
  const chip = matchId ? getBroadcast(matchId) : kickoff ? getBroadcastByKickoff(kickoff) : undefined;
  if (!chip) return undefined;

  const englishCandidates = [
    normalizeEnglish(chip.englishNetwork),
    ...chip.streaming.map((s) => normalizeEnglish(s))
  ].filter(Boolean);

  const spanishCandidates = [normalizeSpanish(chip.spanishNetwork)].filter(Boolean);

  const english = pickFromPriority(englishCandidates, ENGLISH_PRIORITY);
  const spanish = pickFromPriority(spanishCandidates, SPANISH_PRIORITY);

  let streamingNote: string | undefined;
  if (english === "FS1" || english === "FS2") {
    streamingNote = "(+ Peacock)";
  }

  return {
    english,
    spanish,
    streamingNote,
    isConcurrent: chip.isConcurrent
  };
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

const scheduleByMatchId = new Map<string, MatchScheduleEntry>();
for (const match of entries) {
  scheduleByMatchId.set(`M${match.matchNumber}`, match);
}

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

export function getScheduleEntry(matchId: string): MatchScheduleEntry | undefined {
  return scheduleByMatchId.get(matchId);
}

/** Official schedule label for a fixture side (includes knockout placeholders). */
export function getScheduleTeamName(
  matchId: string,
  side: "home" | "away"
): string | undefined {
  const entry = scheduleByMatchId.get(matchId);
  if (!entry) return undefined;
  return side === "home" ? entry.homeTeam : entry.awayTeam;
}

export function getBroadcastByKickoff(kickoffUtc: string): BroadcastChip | undefined {
  const matchId = kickoffToMatchId[normalizeKickoffUtc(kickoffUtc)];
  return matchId ? broadcastIndex[matchId] : undefined;
}

export function getVenueByMatchId(matchId: string): BroadcastChip["venue"] | undefined {
  return getBroadcast(matchId)?.venue;
}

export { broadcastIndex };
