import { useEffect, useState } from "react";
import {
  clearLayoutContainerMarks,
  markLayoutContainers,
  scanUiLayoutIssues,
  type UiDebugIssue,
} from "../../lib/uiDebugScan";
import type { UiDebugSettings } from "../../lib/uiDebug";
import { viewportFrameLabel } from "./UiDebugViewportShell";

type Props = {
  settings: UiDebugSettings;
  scanKey: string;
  onIssuesChange?: (count: number) => void;
};

export function UiDebugOverlay({ settings, scanKey, onIssuesChange }: Props) {
  const [issues, setIssues] = useState<UiDebugIssue[]>([]);

  useEffect(() => {
    if (!settings.enabled) {
      setIssues([]);
      const root = document.querySelector(".wc-chrome");
      if (root instanceof HTMLElement) clearLayoutContainerMarks(root);
      return;
    }

    const runScan = () => {
      const root = document.querySelector(".wc-chrome");
      if (!(root instanceof HTMLElement)) {
        setIssues([]);
        return;
      }

      if (settings.showSpacing) {
        clearLayoutContainerMarks(root);
        markLayoutContainers(root);
      } else {
        clearLayoutContainerMarks(root);
      }

      if (settings.scanOverflow) {
        const found = scanUiLayoutIssues(root);
        setIssues(found);
        onIssuesChange?.(found.length);
      } else {
        setIssues([]);
        onIssuesChange?.(0);
      }
    };

    runScan();
    const timer = window.setInterval(runScan, 1200);
    window.addEventListener("resize", runScan);
    window.addEventListener("scroll", runScan, true);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", runScan);
      window.removeEventListener("scroll", runScan, true);
      const rootEl = document.querySelector(".wc-chrome");
      if (rootEl instanceof HTMLElement) clearLayoutContainerMarks(rootEl);
    };
  }, [settings, scanKey, onIssuesChange]);

  if (!settings.enabled) return null;

  return (
    <>
      <div className="ui-debug-viewport-badge" aria-live="polite">
        {viewportFrameLabel(settings.viewportSim)}
        {issues.length > 0 ? ` · ${issues.length} issue${issues.length === 1 ? "" : "s"}` : ""}
      </div>

      {settings.scanOverflow
        ? issues.map((issue) => (
            <div
              key={issue.id}
              className={`ui-debug-issue-marker ui-debug-issue-marker--${issue.kind}`}
              style={{
                top: issue.rect.top,
                left: issue.rect.left,
                width: issue.rect.width,
                height: issue.rect.height,
              }}
              title={`${issue.label}: ${issue.detail}`}
            >
              <span className="ui-debug-issue-label">{issue.label}</span>
            </div>
          ))
        : null}
    </>
  );
}
