import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  AI_SPORTS_HIGHLIGHTS_HOST,
  aiSportsHighlightsEndpoints,
} from "../config/aiSportsHighlightsEndpoints";
import type {
  AiSportsHighlightsRequest,
  AiSportsHighlightsResponse,
} from "../types/aiSportsHighlights";
import { logger } from "./Logger";

const RAPIDAPI_HOST = providerByHost(AI_SPORTS_HIGHLIGHTS_HOST)?.host ?? AI_SPORTS_HIGHLIGHTS_HOST;

let sessionDisabled = false;

export function isAiSportsHighlightsDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("aiSportsHighlights");
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/ai-sports-highlights";
}

function headers(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

async function postJson<T>(path: string, body: unknown): Promise<T | null> {
  if (isAiSportsHighlightsDisabled()) return null;

  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("AiSportsHighlights", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("AiSportsHighlights", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

/** POST /generateHighlights — immediate response when noqueue=1. */
export async function generateAiSportsHighlights(
  body: AiSportsHighlightsRequest,
  opts?: { noqueue?: boolean }
): Promise<AiSportsHighlightsResponse | null> {
  const path = aiSportsHighlightsEndpoints.generateHighlights({
    noqueue: opts?.noqueue ?? true,
  });
  return postJson<AiSportsHighlightsResponse>(path, body);
}
