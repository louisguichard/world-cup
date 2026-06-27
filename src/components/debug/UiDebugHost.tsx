import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { usePlatform } from "../../hooks/usePlatform";
import { useUiDebug } from "../../hooks/useUiDebug";
import { scanUiLayoutIssues } from "../../lib/uiDebugScan";
import { isUiDebugAvailable } from "../../lib/uiDebug";
import { UiDebugOverlay } from "./UiDebugOverlay";
import { UiDebugToolbar } from "./UiDebugToolbar";
import { UiDebugViewportShell } from "./UiDebugViewportShell";

type Props = {
  children: ReactNode;
  scanKey: string;
};

export function UiDebugHost({ children, scanKey }: Props) {
  const platform = usePlatform();
  const { settings, setSettings, toggleEnabled, setViewportSim } = useUiDebug(platform);
  const [issueCount, setIssueCount] = useState(0);

  const handleRescan = useCallback(() => {
    const root = document.querySelector(".wc-chrome");
    if (!(root instanceof HTMLElement)) {
      setIssueCount(0);
      return;
    }
    setIssueCount(scanUiLayoutIssues(root).length);
  }, []);

  if (!isUiDebugAvailable()) {
    return <>{children}</>;
  }

  if (typeof window !== "undefined") {
    (window as Window & { __wcUiDebugScan?: () => ReturnType<typeof scanUiLayoutIssues> }).__wcUiDebugScan =
      () => {
        const root = document.querySelector(".wc-chrome");
        if (!(root instanceof HTMLElement)) return [];
        return scanUiLayoutIssues(root);
      };
  }

  return (
    <>
      <UiDebugViewportShell settings={settings}>{children}</UiDebugViewportShell>
      <UiDebugToolbar
        settings={settings}
        issueCount={issueCount}
        onToggleEnabled={toggleEnabled}
        onSetViewportSim={setViewportSim}
        onSetSettings={setSettings}
        onRescan={handleRescan}
      />
      <UiDebugOverlay
        settings={settings}
        scanKey={scanKey}
        onIssuesChange={setIssueCount}
      />
    </>
  );
}
