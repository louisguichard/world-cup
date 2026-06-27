import type { MatchDetailTab, SimulatorMode, TabId, TournamentSubTab } from "../types";

const VALID_TABS: TabId[] = [
  "live",
  "results",
  "bracket",
  "groups",
  "simulator",
  "teams",
  "schedule",
  "tournament",
];
const VALID_SIMULATOR_MODES: SimulatorMode[] = ["tournament", "probabilities", "methodology"];
const VALID_MATCH_TABS: MatchDetailTab[] = [
  "summary",
  "watch",
  "highlights",
  "statistics",
  "lineups",
  "commentary",
  "h2h",
];
const VALID_TOURNAMENT_SUB_TABS: TournamentSubTab[] = [
  "matches",
  "standings",
  "bracket",
  "stats",
  "history",
];

export type ParsedAppHash = {
  tab: TabId;
  simulatorMode: SimulatorMode;
  matchId: string | null;
  matchTab: MatchDetailTab;
  tournamentSubTab: TournamentSubTab;
  dateKey: string | null;
  venueSlug: string | null;
};

export function parseAppHash(hash: string): ParsedAppHash {
  const stripped = hash.replace(/^#/, "");
  const [pathPart, queryPart] = stripped.split("?");
  const parts = pathPart.split("/");
  const [primary, secondary, tertiary] = parts;

  const dateKey = queryPart
    ? (new URLSearchParams(queryPart).get("date") ?? null)
    : null;

  if (primary === "match" && secondary) {
    const matchTab = VALID_MATCH_TABS.includes(tertiary as MatchDetailTab)
      ? (tertiary as MatchDetailTab)
      : "summary";
    return {
      tab: "live",
      simulatorMode: "tournament",
      matchId: secondary,
      matchTab,
      tournamentSubTab: "matches",
      dateKey: null,
      venueSlug: null,
    };
  }

  if (primary === "venue" && secondary) {
    return {
      tab: "live",
      simulatorMode: "tournament",
      matchId: null,
      matchTab: "summary",
      tournamentSubTab: "matches",
      dateKey: null,
      venueSlug: secondary,
    };
  }

  if (primary === "tournament") {
    const subTab = VALID_TOURNAMENT_SUB_TABS.includes(secondary as TournamentSubTab)
      ? (secondary as TournamentSubTab)
      : "matches";
    return {
      tab: "tournament",
      simulatorMode: "tournament",
      matchId: null,
      matchTab: "summary",
      tournamentSubTab: subTab,
      dateKey: subTab === "matches" ? dateKey : null,
      venueSlug: null,
    };
  }

  const tab = VALID_TABS.includes(primary as TabId) ? (primary as TabId) : "live";
  const simulatorMode =
    tab === "simulator" && VALID_SIMULATOR_MODES.includes(secondary as SimulatorMode)
      ? (secondary as SimulatorMode)
      : "tournament";

  return {
    tab,
    simulatorMode,
    matchId: null,
    matchTab: "summary",
    tournamentSubTab: "matches",
    dateKey: null,
    venueSlug: null,
  };
}

export function readInitialAppHash(): ParsedAppHash {
  if (typeof window === "undefined") {
    return {
      tab: "live",
      simulatorMode: "tournament",
      matchId: null,
      matchTab: "summary",
      tournamentSubTab: "matches",
      dateKey: null,
      venueSlug: null,
    };
  }
  return parseAppHash(window.location.hash);
}

export function buildAppHash(tab: TabId, simulatorMode: SimulatorMode): string {
  if (tab === "simulator" && simulatorMode !== "tournament") {
    return `#simulator/${simulatorMode}`;
  }
  if (tab === "simulator") {
    return "#simulator";
  }
  return `#${tab}`;
}

export function buildMatchHash(matchId: string, tab?: MatchDetailTab): string {
  if (tab && tab !== "summary") {
    return `#match/${matchId}/${tab}`;
  }
  return `#match/${matchId}`;
}

export function buildTournamentHash(subTab?: TournamentSubTab, dateKey?: string): string {
  const base = subTab && subTab !== "matches" ? `#tournament/${subTab}` : "#tournament";
  if (dateKey && (!subTab || subTab === "matches")) {
    return `${base}?date=${dateKey}`;
  }
  return base;
}

export function buildVenueHash(slug: string): string {
  return `#venue/${slug}`;
}
