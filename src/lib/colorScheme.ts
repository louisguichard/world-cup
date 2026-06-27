export type ColorSchemePreference = "light" | "dark" | "system";
export type ResolvedColorScheme = "light" | "dark";

export const COLOR_SCHEME_STORAGE_KEY = "wc-color-scheme";

export function readStoredColorScheme(): ColorSchemePreference {
  try {
    const value = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* ignore */
  }
  return "system";
}

export function writeStoredColorScheme(preference: ColorSchemePreference): void {
  try {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

export function resolveColorScheme(preference: ColorSchemePreference): ResolvedColorScheme {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const THEME_COLOR: Record<ResolvedColorScheme, string> = {
  dark: "#08091A",
  light: "#F4F5FA",
};

/** Applies resolved theme to the document root (call on preference or OS change). */
export function applyColorScheme(preference: ColorSchemePreference): ResolvedColorScheme {
  const resolved = resolveColorScheme(preference);
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.dataset.themePref = preference;
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[resolved]);

  return resolved;
}
