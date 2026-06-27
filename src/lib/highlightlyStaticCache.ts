import type { HighlightlyHighlight, HighlightlyMatchIntro } from "../types/sportHighlights";

const STORAGE_KEY = "wc-highlightly-static-v1";

type StaticStore = {
  version: 1;
  intros: Record<string, HighlightlyMatchIntro>;
  teamIds: Record<string, number>;
};

function emptyStore(): StaticStore {
  return { version: 1, intros: {}, teamIds: {} };
}

function readStore(): StaticStore {
  if (typeof localStorage === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as StaticStore;
    if (parsed.version !== 1) return emptyStore();
    return {
      version: 1,
      intros: parsed.intros ?? {},
      teamIds: parsed.teamIds ?? {},
    };
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

export function readHighlightIntro(matchId: string): HighlightlyMatchIntro | null {
  return readStore().intros[matchId] ?? null;
}

export function writeHighlightIntro(intro: HighlightlyMatchIntro): void {
  const store = readStore();
  store.intros[intro.matchId] = intro;
  writeStore(store);
}

export function listCachedHighlightIntros(): HighlightlyMatchIntro[] {
  return Object.values(readStore().intros);
}

export function readCachedTeamId(teamName: string): number | null {
  const key = teamName.trim().toLowerCase();
  return readStore().teamIds[key] ?? null;
}

export function writeCachedTeamId(teamName: string, teamId: number): void {
  const store = readStore();
  store.teamIds[teamName.trim().toLowerCase()] = teamId;
  writeStore(store);
}

export function pickIntroHighlight(highlights: HighlightlyHighlight[]): HighlightlyHighlight | null {
  if (highlights.length === 0) return null;
  const introLike = highlights.find((h) => {
    const text = `${h.type ?? ""} ${h.title ?? ""} ${h.description ?? ""}`.toLowerCase();
    return /intro|recap|summary|highlights|full match|extended/.test(text);
  });
  return introLike ?? highlights[0] ?? null;
}

export function buildHighlightAttribution(fetchedAt: string, clipCount: number): string {
  const when = new Date(fetchedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `Highlightly Football API · ${clipCount} clip${clipCount === 1 ? "" : "s"} · saved ${when}`;
}

/** Test-only reset */
export function resetHighlightlyStaticCacheForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
