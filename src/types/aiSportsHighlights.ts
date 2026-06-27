export type AiSportsHighlightsRequest = {
  competition: string;
  teamA: string;
  teamB: string;
  score: string;
  keyMoments: string;
  language: string;
};

export type AiSportsHighlightMoment = {
  time: string;
  description: string;
};

export type AiSportsHighlightResult = {
  title?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  summary?: {
    brief?: string;
    content?: string;
  };
  keyHighlights?: AiSportsHighlightMoment[];
  manOfTheMatch?: {
    name?: string;
    team?: string;
    performance?: string;
  };
  atmosphere?: string;
};

export type AiSportsHighlightsResponse = {
  result?: AiSportsHighlightResult;
  cacheTime?: number;
  error?: string;
  message?: string;
};

export type AiMatchHighlightsIntro = {
  matchId: string;
  request: AiSportsHighlightsRequest;
  response: AiSportsHighlightsResponse | null;
  result: AiSportsHighlightResult | null;
  fetchedAt: string;
  source: "ai-sports-highlights-api";
  attribution: string;
  status: "available" | "empty" | "error" | "pending" | "quota_exceeded";
};
