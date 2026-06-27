import { useCallback, useEffect, useState } from "react";
import { detectDisplayMode } from "../lib/platform";
import {
  canTriggerNativeInstall,
  dismissPwaInstall,
  getDeferredInstallPrompt,
  isPwaInstallDismissed,
  resolveInstallGuideKind,
  subscribePwaInstall,
  triggerNativeInstall,
  waitForInstallPrompt,
  type InstallGuideKind,
  type InstallTriggerResult,
} from "../lib/pwaInstallController";
import { detectPlatform } from "../lib/platform";

export function usePwaInstall() {
  const [dismissed, setDismissed] = useState(isPwaInstallDismissed);
  const [canInstall, setCanInstall] = useState(canTriggerNativeInstall);
  const [installing, setInstalling] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideKind, setGuideKind] = useState<InstallGuideKind>(() => resolveInstallGuideKind());

  const platform = detectPlatform();
  const isStandalone = detectDisplayMode() === "standalone";
  const isIos = platform === "ios";

  useEffect(() => {
    const sync = () => {
      setDismissed(isPwaInstallDismissed());
      setCanInstall(canTriggerNativeInstall());
      setGuideKind(resolveInstallGuideKind());
    };

    sync();
    return subscribePwaInstall(sync);
  }, []);

  const dismiss = useCallback(() => {
    dismissPwaInstall();
    setDismissed(true);
  }, []);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
  }, []);

  const openGuide = useCallback(() => {
    setGuideKind(resolveInstallGuideKind());
    setGuideOpen(true);
  }, []);

  const install = useCallback(async (): Promise<InstallTriggerResult | "guided"> => {
    if (isStandalone) return "unavailable";

    setInstalling(true);
    try {
      if (getDeferredInstallPrompt()) {
        return await triggerNativeInstall();
      }

      const ready = await waitForInstallPrompt(isIos ? 1_500 : 4_000);
      if (ready && getDeferredInstallPrompt()) {
        return await triggerNativeInstall();
      }

      openGuide();
      return "guided";
    } finally {
      setInstalling(false);
    }
  }, [isIos, isStandalone, openGuide]);

  const showBanner =
    !isStandalone &&
    !dismissed &&
    (!import.meta.env.DEV || new URLSearchParams(window.location.search).has("pwa"));

  return {
    showBanner,
    canInstall,
    isIos,
    isStandalone,
    installing,
    guideOpen,
    guideKind,
    install,
    dismiss,
    openGuide,
    closeGuide,
  };
}
