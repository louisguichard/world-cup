import type { DataLoadResult, GroupStanding, MergedMatch, PolymarketMatchMarket, ScoreOverride, Team } from "../../types";
import { GROUP_STAGE_MATCH_COUNT } from "../../types";
import { deriveStandingsIfScored, standingsEqual } from "../../lib/qualification";
import { applyTeamLogoOverrides } from "../../lib/resolveTeamLogo";
import { mergeTeamsWithCatalog } from "../../data/wc2026TeamCatalog";
import { mergeStandingsPartials, finalizeGroupStandings, standingsStatScore, standingsHasLiveStats } from "../../services/adapters/normalizeStandings";

const MAX_DATA_WARNINGS = 12;

function appendDataWarning(existing: string[], message: string): string[] {
  return [...existing, message].slice(-MAX_DATA_WARNINGS);
}

export type TournamentSliceState = {
  teams: Record<string, Team>;
  groupStandings: GroupStanding[];
  knockoutMarkets: PolymarketMatchMarket[];
  scoreOverrides: Record<string, ScoreOverride>;
  bracketPicks: Record<string, string>;
  sources: DataLoadResult["sources"];
  warnings: string[];
  dataWarnings: string[];
  loadedAt: string | null;
  hydrateFromBootstrap: (data: DataLoadResult) => void;
  setTeams: (teams: Record<string, Team>) => void;
  setScoreOverrides: (overrides: Record<string, ScoreOverride>) => void;
  setBracketPicks: (picks: Record<string, string>) => void;
  setGroupStandings: (standings: GroupStanding[]) => void;
  groupStageComplete: () => boolean;
};

export const createTournamentSlice = (
  set: (fn: (state: TournamentSliceState) => Partial<TournamentSliceState>) => void,
  get: () => TournamentSliceState & { liveMatches: Record<string, MergedMatch> }
): TournamentSliceState => ({
  teams: {},
  groupStandings: [],
  knockoutMarkets: [],
  scoreOverrides: {},
  bracketPicks: {},
  sources: {
    espn: false,
    polymarketGames: false,
    polymarketWinner: false,
    fifaRankings: false
  },
  warnings: [],
  dataWarnings: [],
  loadedAt: null,

  hydrateFromBootstrap: (data) => {
    const state = get();
    const incomingTeams = applyTeamLogoOverrides(
      Object.fromEntries(data.teams.map((t) => [t.id, t]))
    );
    const teams = mergeTeamsWithCatalog({ ...state.teams, ...incomingTeams });
    const derived = deriveStandingsIfScored(data.matches, Object.values(teams));
    const mergedStandings = mergeStandingsPartials(state.groupStandings, derived ?? []);

    set(() => ({
      teams,
      knockoutMarkets: data.knockoutMarkets,
      sources: data.sources,
      warnings: data.warnings,
      loadedAt: data.loadedAt,
    }));

    if (mergedStandings.length > 0) {
      get().setGroupStandings(mergedStandings);
    }
  },

  setTeams: (teams) => set(() => ({ teams: mergeTeamsWithCatalog(teams) })),

  setScoreOverrides: (overrides) => set(() => ({ scoreOverrides: overrides })),
  setBracketPicks: (picks) => set(() => ({ bracketPicks: picks })),
  setGroupStandings: (standings) =>
    set((state) => {
      const finalized = finalizeGroupStandings(standings, state.teams);
      const previousScore = standingsStatScore(state.groupStandings);
      const nextScore = standingsStatScore(finalized);
      if (
        state.groupStandings.length > 0 &&
        (nextScore < previousScore ||
          (standingsHasLiveStats(state.groupStandings) && !standingsHasLiveStats(finalized)))
      ) {
        return {
          dataWarnings: appendDataWarning(
            state.dataWarnings,
            `Blocked standings downgrade (${previousScore} → ${nextScore} stat score).`
          ),
        };
      }
      return standingsEqual(finalized, state.groupStandings)
        ? {}
        : { groupStandings: finalized };
    }),

  groupStageComplete: () => {
    const live = get().liveMatches ?? {};
    const completed = Object.values(live).filter((m) => m.group && m.status === "completed");
    return completed.length >= GROUP_STAGE_MATCH_COUNT;
  }
});
