import { isUiDebugAvailable } from "./uiDebug";
import { scanUiLayoutIssues } from "./uiDebugScan";

export type UiDebugScanResult = {
  kind: string;
  label: string;
  detail: string;
};

let registered = false;

/** Expose layout scan for Playwright `ui:debug-sweep` (must exist before React effects). */
export function registerUiDebugScanBridge(): void {
  if (registered || typeof window === "undefined") return;
  registered = true;

  window.__wcUiDebugScan = (): UiDebugScanResult[] => {
    const root = document.querySelector(".wc-chrome");
    if (!(root instanceof HTMLElement)) {
      return [{ kind: "error", label: "root-missing", detail: ".wc-chrome not found" }];
    }

    return scanUiLayoutIssues(root).map((issue) => ({
      kind: issue.kind,
      label: issue.label,
      detail: issue.detail,
    }));
  };
}

if (isUiDebugAvailable()) {
  registerUiDebugScanBridge();
}
