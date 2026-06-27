import type { AiMatchHighlightsIntro } from "../types/aiSportsHighlights";

const STORAGE_KEY = "wc-ai-highlights-static-v1";

type StaticStore = {
  version: 1;
  intros: Record<string, AiMatchHighlightsIntro>;
};

function emptyStore(): StaticStore {
  return { version: 1, intros: {} };
}

function readStore(): StaticStore {
  if (typeof localStorage === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as StaticStore;
    if (parsed.version !== 1) return emptyStore();
    return { version: 1, intros: parsed.intros ?? {} };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StaticStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function readAiHighlightIntro(matchId: string): AiMatchHighlightsIntro | null {
  return readStore().intros[matchId] ?? null;
}

export function writeAiHighlightIntro(intro: AiMatchHighlightsIntro): void {
  const store = readStore();
  store.intros[intro.matchId] = intro;
  writeStore(store);
}

export function buildAiHighlightAttribution(fetchedAt: string): string {
  const when = new Date(fetchedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `AI Sports Highlights API · generated recap · saved ${when}`;
}

/** Test-only reset */
export function resetAiHighlightsStaticCacheForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
