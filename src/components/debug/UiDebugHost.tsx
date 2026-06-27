import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../hooks/usePlatform";
import { useUiDebug } from "../../hooks/useUiDebug";
import { scanUiLayoutIssues } from "../../lib/uiDebugScan";
import { isUiDebugAvailable, isViewportSimScanReliable } from "../../lib/uiDebug";
import { registerUiDebugScanBridge } from "../../lib/uiDebugBridge";
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
    if (!(root instanceof HTMLElement) || !isViewportSimScanReliable(settings.viewportSim)) {
      setIssueCount(0);
      return;
    }
    setIssueCount(scanUiLayoutIssues(root).length);
  }, [settings.viewportSim]);

  useEffect(() => {
    if (!isUiDebugAvailable()) return;
    registerUiDebugScanBridge();
  }, []);

  if (!isUiDebugAvailable()) {
    return <>{children}</>;
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
