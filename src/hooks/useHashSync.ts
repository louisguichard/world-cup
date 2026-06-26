import { useEffect, useRef } from "react";
import { logger } from "../services/Logger";
import { useStore } from "../store";
import type { SimulatorMode, TabId } from "../types";

const VALID_TABS: TabId[] = ["live", "results", "bracket", "groups", "simulator", "teams", "schedule"];
const VALID_SIMULATOR_MODES: SimulatorMode[] = ["tournament", "probabilities", "methodology"];

export function parseAppHash(hash: string): { tab: TabId; simulatorMode: SimulatorMode } {
  const stripped = hash.replace(/^#/, "");
  const [tabPart, subPart] = stripped.split("/");
  const tab = VALID_TABS.includes(tabPart as TabId) ? (tabPart as TabId) : "live";
  const simulatorMode =
    tab === "simulator" && subPart && VALID_SIMULATOR_MODES.includes(subPart as SimulatorMode)
      ? (subPart as SimulatorMode)
      : "tournament";
  return { tab, simulatorMode };
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

export function useHashSync(): void {
  const activeTab = useStore((s) => s.activeTab);
  const simulatorMode = useStore((s) => s.simulatorMode);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const setSimulatorMode = useStore((s) => s.setSimulatorMode);
  const restoredRef = useRef(false);

  useEffect(() => {
    const parsed = parseAppHash(window.location.hash);
    setActiveTab(parsed.tab);
    setSimulatorMode(parsed.simulatorMode);
    if (!restoredRef.current) {
      restoredRef.current = true;
      logger.info("Tab restored from URL hash", "HashSync", parsed);
    }
  }, [setActiveTab, setSimulatorMode]);

  useEffect(() => {
    const newHash = buildAppHash(activeTab, simulatorMode);
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, [activeTab, simulatorMode]);
}
