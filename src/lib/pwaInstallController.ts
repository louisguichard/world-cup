import type { BeforeInstallPromptEvent } from "./platform";
import { detectPlatform } from "./platform";

const DISMISS_KEY = "wc-pwa-install-dismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function isPwaInstallDismissed(): boolean {
  return readDismissed();
}

export function dismissPwaInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
  notify();
}

export function subscribePwaInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function canTriggerNativeInstall(): boolean {
  return deferredPrompt !== null;
}

export function waitForInstallPrompt(timeoutMs = 4_000): Promise<boolean> {
  if (deferredPrompt) return Promise.resolve(true);

  return new Promise((resolve) => {
    const deadline = window.setTimeout(() => {
      unsubscribe();
      resolve(deferredPrompt !== null);
    }, timeoutMs);

    const unsubscribe = subscribePwaInstall(() => {
      if (deferredPrompt) {
        window.clearTimeout(deadline);
        unsubscribe();
        resolve(true);
      }
    });
  });
}

export type InstallTriggerResult = "accepted" | "dismissed" | "unavailable";

/** Invoke the browser install UI when `beforeinstallprompt` was captured. */
export async function triggerNativeInstall(): Promise<InstallTriggerResult> {
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";

  await prompt.prompt();
  const choice = await prompt.userChoice;

  if (choice.outcome === "accepted") {
    deferredPrompt = null;
    dismissPwaInstall();
    return "accepted";
  }

  return "dismissed";
}

export type InstallGuideKind = "ios" | "android" | "desktop-chrome" | "desktop-safari" | "desktop-other";

export function resolveInstallGuideKind(): InstallGuideKind {
  const platform = detectPlatform();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";

  const ua = navigator.userAgent;
  if (/Edg\//.test(ua) || /Chrome\//.test(ua)) return "desktop-chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "desktop-safari";
  return "desktop-other";
}

function bindInstallListeners(): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    dismissPwaInstall();
    notify();
  });
}

if (typeof window !== "undefined") {
  bindInstallListeners();
}
