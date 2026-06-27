import type { TeamProfileBundle } from "../../types/teamProfile";
import { hydrateTeamProfilesFromCache, syncAllTeamProfilesIfNeeded } from "../../services/teamProfile/TeamProfileSync";

export type TeamProfileSliceState = {
  teamProfiles: Record<string, TeamProfileBundle>;
  teamProfileSyncRunning: boolean;
  teamProfileSyncProgress: { completed: number; total: number };
  hydrateTeamProfiles: () => void;
  setTeamProfile: (profile: TeamProfileBundle) => void;
  startTeamProfileSync: () => void;
};

export const createTeamProfileSlice = (
  set: (fn: (state: TeamProfileSliceState) => Partial<TeamProfileSliceState>) => void
): TeamProfileSliceState => ({
  teamProfiles: {},
  teamProfileSyncRunning: false,
  teamProfileSyncProgress: { completed: 0, total: 48 },

  hydrateTeamProfiles: () =>
    set(() => ({
      teamProfiles: hydrateTeamProfilesFromCache(),
    })),

  setTeamProfile: (profile) =>
    set((state) => ({
      teamProfiles: { ...state.teamProfiles, [profile.abbrev]: profile },
    })),

  startTeamProfileSync: () => {
    set(() => ({ teamProfileSyncRunning: true }));
    void syncAllTeamProfilesIfNeeded((profile) => {
      set((state) => ({
        teamProfiles: { ...state.teamProfiles, [profile.abbrev]: profile },
        teamProfileSyncProgress: {
          completed: Object.keys({ ...state.teamProfiles, [profile.abbrev]: profile }).length,
          total: 48,
        },
      }));
    }).finally(() => {
      set(() => ({ teamProfileSyncRunning: false }));
    });
  },
});
