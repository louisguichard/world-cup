/** Runtime platform detection for native-like mobile & desktop shells. */

export type AppPlatform = "ios" | "android" | "desktop";
export type AppDisplayMode = "standalone" | "browser";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function detectPlatform(): AppPlatform {
  if (typeof navigator === "undefined") return "desktop";

  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIos) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function detectDisplayMode(): AppDisplayMode {
  if (typeof window === "undefined") return "browser";

  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    nav.standalone === true;

  return standalone ? "standalone" : "browser";
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

export function supportsServiceWorker(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export function applyPlatformAttributes(
  platform: AppPlatform,
  displayMode: AppDisplayMode,
  touch: boolean
): void {
  const root = document.documentElement;
  root.dataset.platform = platform;
  root.dataset.display = displayMode;
  root.dataset.touch = touch ? "true" : "false";
}
