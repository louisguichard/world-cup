import { useCallback, useEffect, useState } from "react";
import type { BeforeInstallPromptEvent } from "../lib/platform";
import { detectDisplayMode, detectPlatform } from "../lib/platform";

const DISMISS_KEY = "wc-pwa-install-dismissed";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [installing, setInstalling] = useState(false);

  const platform = detectPlatform();
  const isStandalone = detectDisplayMode() === "standalone";
  const isIos = platform === "ios";

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        localStorage.setItem(DISMISS_KEY, "1");
        setDismissed(true);
        return true;
      }
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const showBanner =
    !isStandalone && !dismissed && !import.meta.env.DEV && (Boolean(deferredPrompt) || isIos);

  return {
    showBanner,
    canInstall: Boolean(deferredPrompt),
    isIos,
    isStandalone,
    installing,
    install,
    dismiss,
  };
}
