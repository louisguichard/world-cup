import { useCallback, useEffect, useMemo, useState } from "react";
import { applyPlatformAttributes } from "../lib/platform";
import {
  DEFAULT_UI_DEBUG_SETTINGS,
  readUiDebugSettings,
  writeUiDebugSettings,
  type UiDebugSettings,
  type ViewportSimulation,
} from "../lib/uiDebug";
import type { AppPlatform, AppDisplayMode } from "../lib/platform";

type PlatformSnapshot = {
  platform: AppPlatform;
  displayMode: AppDisplayMode;
  isTouch: boolean;
};

export function useUiDebug(platform: PlatformSnapshot) {
  const [settings, setSettingsState] = useState<UiDebugSettings>(() => {
    const base = readUiDebugSettings();
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("uidebug")) {
      return { ...base, enabled: true, scanOverflow: true };
    }
    return base;
  });

  const setSettings = useCallback((partial: Partial<UiDebugSettings>) => {
    setSettingsState((prev) => {
      const next = writeUiDebugSettings({ ...prev, ...partial });
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_UI_DEBUG_SETTINGS);
    writeUiDebugSettings(DEFAULT_UI_DEBUG_SETTINGS);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const { enabled, viewportSim, showBoundaries, showSpacing } = settings;

    root.dataset.uiDebug = enabled ? "true" : "false";
    root.dataset.uiDebugBoundaries = enabled && showBoundaries ? "true" : "false";
    root.dataset.uiDebugSpacing = enabled && showSpacing ? "true" : "false";
    root.dataset.uiViewportSim = enabled ? viewportSim : "native";

    if (enabled && viewportSim === "mobile") {
      applyPlatformAttributes(platform.platform, platform.displayMode, true);
    } else if (enabled && viewportSim === "desktop") {
      applyPlatformAttributes(platform.platform, platform.displayMode, false);
    } else {
      applyPlatformAttributes(platform.platform, platform.displayMode, platform.isTouch);
    }

    return () => {
      delete root.dataset.uiDebug;
      delete root.dataset.uiDebugBoundaries;
      delete root.dataset.uiDebugSpacing;
      root.dataset.uiViewportSim = "native";
      applyPlatformAttributes(platform.platform, platform.displayMode, platform.isTouch);
    };
  }, [settings, platform]);

  const toggleEnabled = useCallback(() => {
    setSettings({ enabled: !settings.enabled });
  }, [setSettings, settings.enabled]);

  const setViewportSim = useCallback(
    (viewportSim: ViewportSimulation) => setSettings({ viewportSim }),
    [setSettings]
  );

  return useMemo(
    () => ({
      settings,
      setSettings,
      resetSettings,
      toggleEnabled,
      setViewportSim,
    }),
    [settings, setSettings, resetSettings, toggleEnabled, setViewportSim]
  );
}
