import type { Team, MergedMatch } from "../../types";
import type { YouTubeMatchVideo, YouTubeRawCandidate, YouTubeVideoKind } from "../../types/youtubeHighlights";
import {
  FOX_SOCCER_CHANNEL_ID,
  OFFICIAL_MATCH_VIDEO_CHANNELS,
  TELEMUNDO_DEPORTES_CHANNEL_ID,
} from "../../config/youtubeHighlightsEndpoints";

type VerifyInput = {
  match: MergedMatch;
  homeTeam?: Team;
  awayTeam?: Team;
  homeTeamName: string;
  awayTeamName: string;
};

const HIGHLIGHT_TERMS = [
  "highlight",
  "highlights",
  "recap",
  "resumen",
  "goles",
  "golazos",
  "extended highlights",
] as const;

const PREMATCH_TERMS = [
  "preview",
  "pre-match",
  "prematch",
  "pre match",
  "previa",
  "predictions",
  "how to watch",
] as const;

const SOCCER_CONTEXT_TERMS = [
  "world cup",
  "fifa",
  "soccer",
  "football",
  "fútbol",
  "futbol",
  "copa mundial",
] as const;

const PROVIDER_TERMS = ["fox soccer", "fox sports", "telemundo deportes", "telemundo"] as const;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compact(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function termsForTeam(teamName: string, team?: Team): string[] {
  const raw = [
    teamName,
    team?.name,
    team?.shortName,
    team?.abbreviation,
    team?.id,
  ].filter((v): v is string => Boolean(v?.trim()));

  const terms = new Set<string>();
  for (const item of raw) {
    const normalized = normalizeText(item).trim();
    if (normalized.length >= 2) terms.add(normalized);
    const compressed = compact(item);
    if (compressed.length >= 3) terms.add(compressed);
  }
  return [...terms];
}

function hasTerm(text: string, term: string): boolean {
  if (!term) return false;
  if (term.includes(" ")) return text.includes(term);
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text);
}

function hasAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => hasTerm(text, normalizeText(term)));
}

function inferKind(text: string): YouTubeVideoKind | null {
  if (hasAny(text, HIGHLIGHT_TERMS)) return "highlights";
  if (hasAny(text, PREMATCH_TERMS)) return "pre-match";
  return null;
}

function inferProvider(candidate: YouTubeRawCandidate): YouTubeMatchVideo["provider"] {
  const channelId = candidate.channelId;
  const text = normalizeText(`${candidate.channelTitle ?? ""} ${candidate.title ?? ""}`);
  if (channelId === FOX_SOCCER_CHANNEL_ID || text.includes("fox soccer") || text.includes("fox sports")) {
    return "fox";
  }
  if (
    channelId === TELEMUNDO_DEPORTES_CHANNEL_ID ||
    text.includes("telemundo deportes") ||
    text.includes("telemundo")
  ) {
    return "telemundo";
  }
  return "unknown";
}

function isOfficialChannel(candidate: YouTubeRawCandidate): boolean {
  return OFFICIAL_MATCH_VIDEO_CHANNELS.some((channel) => channel.id === candidate.channelId);
}

export function verifyYouTubeMatchVideo(
  candidate: YouTubeRawCandidate,
  input: VerifyInput
): YouTubeMatchVideo | null {
  if (!candidate.videoId || !candidate.title) return null;

  const text = normalizeText(
    `${candidate.title} ${candidate.description ?? ""} ${candidate.channelTitle ?? ""}`
  );
  const compactText = compact(text);

  const homeTerms = termsForTeam(input.homeTeamName, input.homeTeam);
  const awayTerms = termsForTeam(input.awayTeamName, input.awayTeam);
  const homeMatched = homeTerms.some((term) => hasTerm(text, term) || compactText.includes(term));
  const awayMatched = awayTerms.some((term) => hasTerm(text, term) || compactText.includes(term));
  const kind = inferKind(text);
  const provider = inferProvider(candidate);
  const officialChannel = isOfficialChannel(candidate);
  const providerMentioned = hasAny(text, PROVIDER_TERMS);
  const soccerContext = hasAny(text, SOCCER_CONTEXT_TERMS);

  let confidence = 0;
  if (homeMatched) confidence += 30;
  if (awayMatched) confidence += 30;
  if (kind) confidence += 15;
  if (officialChannel) confidence += 15;
  if (providerMentioned) confidence += 10;
  if (soccerContext) confidence += 10;

  if (!kind) return null;

  const verified = homeMatched && awayMatched && Boolean(kind) && (officialChannel || providerMentioned);
  if (!verified || confidence < 75) return null;

  return {
    id: `${candidate.source}:${candidate.videoId}`,
    videoId: candidate.videoId,
    title: candidate.title,
    description: candidate.description,
    channelId: candidate.channelId,
    channelTitle: candidate.channelTitle,
    publishedAt: candidate.publishedAt,
    thumbnailUrl: candidate.thumbnailUrl,
    watchUrl: candidate.url ?? `https://www.youtube.com/watch?v=${candidate.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${candidate.videoId}`,
    source: candidate.source,
    provider,
    kind,
    verified,
    confidence,
  };
}

