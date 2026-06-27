import { useEffect, useState } from "react";
import {
  applyPlatformAttributes,
  detectDisplayMode,
  detectPlatform,
  isTouchDevice,
  type AppDisplayMode,
  type AppPlatform,
} from "../lib/platform";

export type PlatformState = {
  platform: AppPlatform;
  displayMode: AppDisplayMode;
  isStandalone: boolean;
  isTouch: boolean;
};

function readPlatformState(): PlatformState {
  const platform = detectPlatform();
  const displayMode = detectDisplayMode();
  return {
    platform,
    displayMode,
    isStandalone: displayMode === "standalone",
    isTouch: isTouchDevice(),
  };
}

/** Tracks OS, installed PWA mode, and touch vs pointer — updates on display-mode changes. */
export function usePlatform(): PlatformState {
  const [state, setState] = useState<PlatformState>(() => readPlatformState());

  useEffect(() => {
    const sync = () => {
      const next = readPlatformState();
      setState(next);
      applyPlatformAttributes(next.platform, next.displayMode, next.isTouch);
    };

    sync();

    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return state;
}
