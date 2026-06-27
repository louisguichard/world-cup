import { detectPlatform, isTouchDevice } from "./platform";

/** True when we should prioritize time-to-interactive over full enrichment at splash. */
export function isMobileBootProfile(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = detectPlatform();
  if (platform === "ios" || platform === "android") return true;
  return isTouchDevice() && window.innerWidth < 820;
}

export function espnBootTimeoutMs(mobileFast: boolean): number {
  return mobileFast ? 5_000 : 8_000;
}

export function splashMinimumHoldMs(mobileFast: boolean): number {
  return mobileFast ? 280 : 700;
}

export function isBootDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("wc-boot-debug") === "1") return true;
    return new URLSearchParams(window.location.search).has("bootdebug");
  } catch {
    return false;
  }
}
