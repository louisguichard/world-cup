import { useEffect, useRef } from "react";
import { logger } from "../services/Logger";
import { useStore } from "../store";
import type { TabId } from "../types";

const VALID_TABS: TabId[] = ["live", "bracket", "groups", "simulator", "teams"];

export function useHashSync(): void {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const restoredRef = useRef(false);

  useEffect(() => {
    const hashTab = window.location.hash.replace("#", "") as TabId;
    if (VALID_TABS.includes(hashTab)) {
      setActiveTab(hashTab);
      if (!restoredRef.current) {
        restoredRef.current = true;
        logger.info("Tab restored from URL hash", "HashSync", { tab: hashTab });
      }
    }
  }, [setActiveTab]);

  useEffect(() => {
    const newHash = `#${activeTab}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, [activeTab]);
}
