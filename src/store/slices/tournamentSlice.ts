import { GROUP_STAGE_MATCH_COUNT } from "../../types";
import type { DataLoadResult, GroupStanding, MergedMatch, PolymarketMatchMarket, ScoreOverride, Team } from "../../types";

export type TournamentSliceState = {
  teams: Record<string, Team>;
  groupStandings: GroupStanding[];
  knockoutMarkets: PolymarketMatchMarket[];
  scoreOverrides: Record<string, ScoreOverride>;
  bracketPicks: Record<string, string>;
  sources: DataLoadResult["sources"];
  warnings: string[];
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
  loadedAt: null,

  hydrateFromBootstrap: (data) =>
    set(() => ({
      teams: Object.fromEntries(data.teams.map((t) => [t.id, t])),
      groupStandings: [],
      knockoutMarkets: data.knockoutMarkets,
      sources: data.sources,
      warnings: data.warnings,
      loadedAt: data.loadedAt
    })),

  setTeams: (teams) => set(() => ({ teams })),

  setScoreOverrides: (overrides) => set(() => ({ scoreOverrides: overrides })),
  setBracketPicks: (picks) => set(() => ({ bracketPicks: picks })),
  setGroupStandings: (standings) => set(() => ({ groupStandings: standings })),

  groupStageComplete: () => {
    const live = get().liveMatches ?? {};
    const completed = Object.values(live).filter((m) => m.group && m.status === "completed");
    return completed.length >= GROUP_STAGE_MATCH_COUNT;
  }
});
