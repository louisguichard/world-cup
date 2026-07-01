import { useEffect } from "react";
import { preferTreeLayoutForKnockoutIfUnset } from "../lib/bracketLayoutPreference";
import { useStore } from "../store";
import { useTournamentPhase } from "./useTournamentPhase";

/** On Bracket tab: default to tree on desktop during knockout when layout was never saved. */
export function usePreferBracketTreeDuringKnockout(): void {
  const { isKnockoutActive } = useTournamentPhase();
  const layoutMode = useStore((s) => s.bracketLayoutMode);
  const setBracketLayoutMode = useStore((s) => s.setBracketLayoutMode);

  useEffect(() => {
    const preferred = preferTreeLayoutForKnockoutIfUnset(isKnockoutActive);
    if (preferred && layoutMode !== preferred) {
      setBracketLayoutMode(preferred);
    }
  }, [isKnockoutActive, layoutMode, setBracketLayoutMode]);
}
