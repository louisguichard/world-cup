export type ViewportSimulation = "native" | "mobile" | "desktop";

export type UiDebugSettings = {
  enabled: boolean;
  viewportSim: ViewportSimulation;
  showBoundaries: boolean;
  showSpacing: boolean;
  scanOverflow: boolean;
};

export const UI_DEBUG_VIEWPORTS = {
  mobile: { width: 390, height: 844, label: "Mobile simulation" },
  desktop: { width: 1280, height: 800, label: "Desktop simulation" },
} as const;

const STORAGE_KEY = "wc-ui-debug-settings";

export const DEFAULT_UI_DEBUG_SETTINGS: UiDebugSettings = {
  enabled: false,
  viewportSim: "native",
  showBoundaries: true,
  showSpacing: false,
  scanOverflow: true,
};

/** Dev tooling — off in production unless explicitly enabled. */
export function isUiDebugAvailable(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("wc-ui-debug") === "1") return true;
    return new URLSearchParams(window.location.search).has("uidebug");
  } catch {
    return false;
  }
}

export function readUiDebugSettings(): UiDebugSettings {
  if (typeof window === "undefined") return DEFAULT_UI_DEBUG_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_UI_DEBUG_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UiDebugSettings>;
    return { ...DEFAULT_UI_DEBUG_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_UI_DEBUG_SETTINGS;
  }
}

export function writeUiDebugSettings(partial: Partial<UiDebugSettings>): UiDebugSettings {
  const next = { ...readUiDebugSettings(), ...partial };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export function viewportSimLabel(sim: ViewportSimulation): string {
  if (sim === "native") return "Native viewport";
  return UI_DEBUG_VIEWPORTS[sim].label;
}
