import { isUiDebugAvailable } from "./uiDebug";
import { scanUiLayoutIssues } from "./uiDebugScan";

declare global {
  interface Window {
    __wcUiDebugScan?: () => ReturnType<typeof scanUiLayoutIssues>;
  }
}

/** Stable Playwright entry point — registered after mount, not during render. */
export function registerUiDebugScanBridge(): void {
  if (!isUiDebugAvailable()) return;

  window.__wcUiDebugScan = () => {
    const root = document.querySelector(".wc-chrome");
    if (!(root instanceof HTMLElement)) return [];
    return scanUiLayoutIssues(root);
  };
}
