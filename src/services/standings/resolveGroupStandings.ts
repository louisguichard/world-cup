import type { GroupStanding, MergedMatch, Team } from "../../types";
import { isApiEnabled } from "../../config/apiFlags";
import { deriveStandingsIfScored } from "../../lib/qualification";
import { readStandingsCache } from "../../lib/standingsCache";
import {
  buildStandingsFromTeamGroups,
  mergeStandingsPartials,
  normalizeStandingsTeamIds,
  normalizeWCLiveStandings,
  normalizeWC2026Groups,
  normalizeZafronixBracket,
  normalizeZafronixStandings,
} from "../adapters/normalizeStandings";
import {
  fetchBracket as fetchZafronixBracket,
  fetchStandings as fetchZafronixStandings,
  isZafronixDisabled,
} from "../ZafronixClient";
import {
  fetchStandings as fetchWcLiveStandings,
  isWc2026LiveDisabled,
} from "../WorldCup2026LiveClient";
import { fetchGroups, isWorldCup2026Disabled } from "../WorldCup2026Client";
import {
  fetchFootApi7GroupStandings,
  isFootApi7Disabled,
} from "../FootApi7Client";
import { loadCachedFootApi7Bundle } from "../../lib/footApi7Cache";
import { fetchWithFallback, STANDINGS_SOURCE_PRIORITY } from "../orchestrator/FallbackChain";

export type ResolveGroupStandingsOptions = {
  matches: MergedMatch[];
  teamsList: Team[];
  currentStandings?: GroupStanding[];
  /** When false, only merge cache + local derivation (no network). */
  includeRemote?: boolean;
};

function buildLocalStandingsBaseline(
  matches: MergedMatch[],
  teamsList: Team[],
  currentStandings: GroupStanding[]
): GroupStanding[] {
  const cached = readStandingsCache() ?? [];
  const derived = deriveStandingsIfScored(matches, teamsList);
  const seeded = buildStandingsFromTeamGroups(teamsList);
  return mergeStandingsPartials(cached, currentStandings, derived ?? [], seeded);
}

async function fetchRemoteStandings(): Promise<GroupStanding[]> {
  const { data } = await fetchWithFallback(
    STANDINGS_SOURCE_PRIORITY,
    {
      wclive: async () => {
        if (!isApiEnabled("wc2026Live") || isWc2026LiveDisabled()) return null;
        const raw = await fetchWcLiveStandings();
        const normalized = normalizeWCLiveStandings(raw);
        return normalized.length > 0 ? normalized : null;
      },
      footapi7: async () => {
        if (!isApiEnabled("footApi7") || isFootApi7Disabled()) return null;
        const cached = loadCachedFootApi7Bundle()?.groupStandings;
        if (cached && cached.length > 0) return cached;
        const normalized = await fetchFootApi7GroupStandings();
        return normalized.length > 0 ? normalized : null;
      },
      zafronix: async () => {
        if (!isApiEnabled("zafronix") || isZafronixDisabled()) return null;
        const fromStandings = normalizeZafronixStandings(await fetchZafronixStandings(2026));
        if (fromStandings.length > 0) return fromStandings;
        const fromBracket = normalizeZafronixBracket(await fetchZafronixBracket(2026));
        return fromBracket.length > 0 ? fromBracket : null;
      },
      wc2026teams: async () => {
        if (!isApiEnabled("wc2026Teams") || isWorldCup2026Disabled()) return null;
        const normalized = normalizeWC2026Groups(await fetchGroups());
        return normalized.length > 0 ? normalized : null;
      },
      static: async () => null,
    },
    null
  );

  return Array.isArray(data) ? data : [];
}

/** Merge cache, local scores, and redundant API sources — never downgrade to empty tables. */
export async function resolveGroupStandings(
  options: ResolveGroupStandingsOptions
): Promise<GroupStanding[]> {
  const {
    matches,
    teamsList,
    currentStandings = [],
    includeRemote = true,
  } = options;

  const teamsById = Object.fromEntries(teamsList.map((t) => [t.id, t]));
  const localBaseline = buildLocalStandingsBaseline(matches, teamsList, currentStandings);
  const derived = deriveStandingsIfScored(matches, teamsList);

  let merged = localBaseline;
  if (includeRemote) {
    const remote = await fetchRemoteStandings();
    merged = mergeStandingsPartials(localBaseline, derived ?? [], remote);
  }

  if (merged.length === 0) {
    return [];
  }

  return normalizeStandingsTeamIds(merged, teamsById);
}
