import type { BracketLayoutMode } from "../types";

export const BRACKET_LAYOUT_STORAGE_KEY = "wc-bracket-layout";

const DESKTOP_TREE_MIN_WIDTH = 1024;

/** Default layout when the user has not saved a preference. */
export function resolveDefaultBracketLayoutMode(): BracketLayoutMode {
  if (typeof window === "undefined") return "tree";
  return window.matchMedia(`(min-width: ${DESKTOP_TREE_MIN_WIDTH}px)`).matches ? "tree" : "schedule";
}

export function readStoredBracketLayoutMode(): BracketLayoutMode {
  try {
    const value = localStorage.getItem(BRACKET_LAYOUT_STORAGE_KEY);
    if (value === "tree" || value === "schedule") return value;
  } catch {
    /* ignore */
  }
  return resolveDefaultBracketLayoutMode();
}

/** True when the user explicitly saved tree or schedule in localStorage. */
export function hasStoredBracketLayoutPreference(): boolean {
  try {
    const value = localStorage.getItem(BRACKET_LAYOUT_STORAGE_KEY);
    return value === "tree" || value === "schedule";
  } catch {
    return false;
  }
}

/**
 * During knockout on desktop, prefer tree when the user has not saved a layout yet.
 * Returns null when no override is needed.
 */
export function preferTreeLayoutForKnockoutIfUnset(isKnockoutActive: boolean): BracketLayoutMode | null {
  if (!isKnockoutActive || hasStoredBracketLayoutPreference()) return null;
  if (!isDesktopBracketViewport()) return null;
  return "tree";
}

export function writeStoredBracketLayoutMode(mode: BracketLayoutMode): void {
  try {
    localStorage.setItem(BRACKET_LAYOUT_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function isDesktopBracketViewport(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(`(min-width: ${DESKTOP_TREE_MIN_WIDTH}px)`).matches;
}
