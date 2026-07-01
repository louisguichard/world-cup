import type { MatchEvent, MergedMatch, Team } from "../../types";
import { commitLiveMatchStore } from "../../lib/commitLiveMatchStore";
import type { AppStore } from "../index";

export type LockedMatchIds = Record<string, true>;

export type MatchSliceState = {
  liveMatches: Record<string, MergedMatch>;
  lockedMatchIds: LockedMatchIds;
  matchEvents: Record<string, MatchEvent[]>;
  lastPollAt: number | null;
  consecutiveErrors: number;
  lastGoalTimestamp: number | null;
  lastGoalAnnouncement: string | null;
  setLiveMatches: (matches: Record<string, MergedMatch>) => void;
  addLockedMatchId: (id: string) => void;
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

export function getLockedSet(state: Pick<MatchSliceState, "lockedMatchIds">): Set<string> {
  return new Set(Object.keys(state.lockedMatchIds));
}

export const createMatchSlice = (
  set: (fn: (state: MatchSliceState) => Partial<MatchSliceState>) => void,
  get: () => MatchSliceState & Pick<AppStore, "teams">
): MatchSliceState => ({
  liveMatches: {},
  lockedMatchIds: {},
  matchEvents: {},
  lastPollAt: null,
  consecutiveErrors: 0,
  lastGoalTimestamp: null,
  lastGoalAnnouncement: null,

  setLiveMatches: (matches) =>
    set((state) => {
      const { merged, changed } = commitLiveMatchStore(state.liveMatches, matches, get().teams);
      if (!changed) return {};
      return { liveMatches: merged };
    }),

  addLockedMatchId: (id) =>
    set((state) =>
      state.lockedMatchIds[id]
        ? {}
        : { lockedMatchIds: { ...state.lockedMatchIds, [id]: true } }
    ),

  batchPollUpdate: (payload) =>
    set((state) => {
      const { merged, changed } = commitLiveMatchStore(
        state.liveMatches,
        payload.matches,
        get().teams
      );
      if (!changed) return {};

      return {
        liveMatches: merged,
        matchEvents: payload.events ?? state.matchEvents,
        lastPollAt: payload.lastPollAt,
        consecutiveErrors: payload.consecutiveErrors,
        lastGoalTimestamp: payload.lastGoalTimestamp ?? state.lastGoalTimestamp,
        lastGoalAnnouncement: payload.lastGoalAnnouncement ?? state.lastGoalAnnouncement,
      };
    }),

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
