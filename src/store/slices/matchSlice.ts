import type { MatchEvent, MergedMatch } from "../../types";

export type MatchSliceState = {
  liveMatches: Record<string, MergedMatch>;
  matchEvents: Record<string, MatchEvent[]>;
  lastPollAt: number | null;
  consecutiveErrors: number;
  lastGoalTimestamp: number | null;
  lastGoalAnnouncement: string | null;
  setLiveMatches: (matches: Record<string, MergedMatch>) => void;
  batchPollUpdate: (payload: {
    matches: Record<string, MergedMatch>;
    events?: Record<string, MatchEvent[]>;
    lastPollAt: number;
    consecutiveErrors: number;
    lastGoalTimestamp?: number | null;
    lastGoalAnnouncement?: string | null;
  }) => void;
  mergeMatchEvents: (matchId: string, incoming: MatchEvent[]) => void;
  resetManualOverride: (matchId: string) => void;
};

export const createMatchSlice = (
  set: (fn: (state: MatchSliceState) => Partial<MatchSliceState>) => void,
  get: () => MatchSliceState
): MatchSliceState => ({
  liveMatches: {},
  matchEvents: {},
  lastPollAt: null,
  consecutiveErrors: 0,
  lastGoalTimestamp: null,
  lastGoalAnnouncement: null,

  setLiveMatches: (matches) => set(() => ({ liveMatches: matches })),

  batchPollUpdate: (payload) =>
    set((state) => ({
      liveMatches: payload.matches,
      matchEvents: payload.events ?? state.matchEvents,
      lastPollAt: payload.lastPollAt,
      consecutiveErrors: payload.consecutiveErrors,
      lastGoalTimestamp: payload.lastGoalTimestamp ?? state.lastGoalTimestamp,
      lastGoalAnnouncement: payload.lastGoalAnnouncement ?? state.lastGoalAnnouncement
    })),

  mergeMatchEvents: (matchId, incoming) =>
    set((state) => {
      const existing = state.matchEvents[matchId] ?? [];
      const known = new Set(existing.map((e) => e.providerId));
      const merged = [...existing];
      let lastGoal: { ts: number; announcement: string } | null = null;

      for (const event of incoming) {
        if (known.has(event.providerId)) continue;
        merged.push(event);
        if (event.type === "goal" || event.type === "own_goal") {
          lastGoal = {
            ts: Date.now(),
            announcement: `Goal! ${event.playerName} ${event.minute}'`
          };
        }
      }

      return {
        matchEvents: { ...state.matchEvents, [matchId]: merged },
        ...(lastGoal
          ? { lastGoalTimestamp: lastGoal.ts, lastGoalAnnouncement: lastGoal.announcement }
          : {})
      };
    }),

  resetManualOverride: (matchId) =>
    set((state) => {
      const match = state.liveMatches[matchId];
      if (!match || match.source !== "manual") return {};
      const { [matchId]: _removed, ...rest } = state.liveMatches;
      return { liveMatches: rest };
    })
});
