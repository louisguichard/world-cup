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

export const DEFAULT_VIEWPORT_META = "width=device-width, initial-scale=1.0, viewport-fit=cover";

const STORAGE_KEY = "wc-ui-debug-settings";
let savedViewportMeta: string | null = null;

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

/** Live overflow scan only matches sweep when layout viewport ≈ sim width. */
export function isViewportSimScanReliable(sim: ViewportSimulation): boolean {
  if (sim === "native") return true;
  if (typeof window === "undefined") return true;
  const target = UI_DEBUG_VIEWPORTS[sim].width;
  return Math.abs(window.innerWidth - target) <= 8;
}

export function viewportSimScanHint(sim: ViewportSimulation): string | null {
  if (sim === "native" || isViewportSimScanReliable(sim)) return null;
  const target = UI_DEBUG_VIEWPORTS[sim].width;
  return `Live scan paused — browser is ${window.innerWidth}px wide; resize to ~${target}px or use Native. Automated sweep still uses ${target}px.`;
}

/** Pin layout viewport width so media queries match Playwright sweep widths. */
export function syncViewportSimMeta(enabled: boolean, sim: ViewportSimulation): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!(meta instanceof HTMLMetaElement)) return;

  if (!enabled || sim === "native") {
    if (savedViewportMeta !== null) {
      meta.content = savedViewportMeta;
      savedViewportMeta = null;
      window.dispatchEvent(new Event("resize"));
    }
    return;
  }

  if (savedViewportMeta === null) {
    savedViewportMeta = meta.content;
  }

  const { width } = UI_DEBUG_VIEWPORTS[sim];
  meta.content = `width=${width}, initial-scale=1, viewport-fit=cover`;
  window.dispatchEvent(new Event("resize"));
}
