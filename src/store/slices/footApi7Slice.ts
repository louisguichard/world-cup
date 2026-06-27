import type { FootApi7Bundle } from "../../types/footApi7";
import {
  loadCachedFootApi7Bundle,
  syncFootApi7IfNeeded,
} from "../../services/footApi7/FootApi7Sync";

export type FootApi7SliceState = {
  footApi7Bundle: FootApi7Bundle | null;
  footApi7SyncRunning: boolean;
  hydrateFootApi7: () => void;
  setFootApi7Bundle: (bundle: FootApi7Bundle) => void;
  startFootApi7Sync: () => void;
};

export const createFootApi7Slice = (
  set: (fn: (state: FootApi7SliceState) => Partial<FootApi7SliceState>) => void
): FootApi7SliceState => ({
  footApi7Bundle: null,
  footApi7SyncRunning: false,

  hydrateFootApi7: () =>
    set(() => ({
      footApi7Bundle: loadCachedFootApi7Bundle(),
    })),

  setFootApi7Bundle: (bundle) =>
    set(() => ({
      footApi7Bundle: bundle,
    })),

  startFootApi7Sync: () => {
    set(() => ({ footApi7SyncRunning: true }));
    void syncFootApi7IfNeeded((bundle) => {
      set(() => ({ footApi7Bundle: bundle }));
    }).finally(() => {
      set(() => ({ footApi7SyncRunning: false }));
    });
  },
});
