import { useMemo } from "react";
import {
  isUiDebugAvailable,
  isViewportSimScanReliable,
  UI_DEBUG_VIEWPORTS,
  viewportSimLabel,
  viewportSimScanHint,
  type ViewportSimulation,
} from "../../lib/uiDebug";
import type { UiDebugIssueKind } from "../../lib/uiDebugScan";
import type { UiDebugSettings } from "../../lib/uiDebug";

type Props = {
  settings: UiDebugSettings;
  issueCount: number;
  onToggleEnabled: () => void;
  onSetViewportSim: (sim: ViewportSimulation) => void;
  onSetSettings: (partial: Partial<UiDebugSettings>) => void;
  onRescan: () => void;
};

const VIEWPORT_OPTIONS: ViewportSimulation[] = ["native", "mobile", "desktop"];

const ISSUE_LABELS: Record<UiDebugIssueKind, string> = {
  "page-horizontal-overflow": "Page overflow",
  "horizontal-overflow": "Horizontal overflow",
  "vertical-clip": "Vertical clip",
  "layout-collision": "Layout collision",
};

export function UiDebugToolbar({
  settings,
  issueCount,
  onToggleEnabled,
  onSetViewportSim,
  onSetSettings,
  onRescan,
}: Props) {
  const available = isUiDebugAvailable();

  const issueSummary = useMemo(() => {
    if (!settings.scanOverflow) return "Overflow scan off";
    const scanHint = viewportSimScanHint(settings.viewportSim);
    if (scanHint) return scanHint;
    if (issueCount === 0) return "No layout issues detected";
    return `${issueCount} layout issue${issueCount === 1 ? "" : "s"} detected`;
  }, [issueCount, settings.scanOverflow, settings.viewportSim]);

  if (!available) return null;

  return (
    <div className={`ui-debug-toolbar${settings.enabled ? " is-active" : ""}`}>
      <button
        type="button"
        className="ui-debug-toolbar-toggle"
        onClick={onToggleEnabled}
        aria-pressed={settings.enabled}
      >
        Debug UI
      </button>

      {settings.enabled ? (
        <div className="ui-debug-panel" role="region" aria-label="UI debug controls">
          <div className="ui-debug-panel-head">
            <strong>Layout inspector</strong>
            <span className="ui-debug-panel-status">{issueSummary}</span>
          </div>

          <div className="ui-debug-panel-section">
            <span className="ui-debug-panel-label">Viewport</span>
            <div className="ui-debug-segmented">
              {VIEWPORT_OPTIONS.map((sim) => (
                <button
                  key={sim}
                  type="button"
                  className={`ui-debug-segment${settings.viewportSim === sim ? " is-active" : ""}`}
                  onClick={() => onSetViewportSim(sim)}
                  aria-pressed={settings.viewportSim === sim}
                >
                  {sim === "native" ? "Native" : sim === "mobile" ? "Mobile" : "Desktop"}
                </button>
              ))}
            </div>
            <span className="ui-debug-panel-hint">{viewportSimLabel(settings.viewportSim)}</span>
            {settings.viewportSim !== "native" ? (
              <span className="ui-debug-panel-hint ui-debug-panel-hint--sim">
                {isViewportSimScanReliable(settings.viewportSim)
                  ? `Layout viewport ~${UI_DEBUG_VIEWPORTS[settings.viewportSim].width}px — matches ui:debug-sweep.`
                  : `CSS frame preview only until window ≈ ${UI_DEBUG_VIEWPORTS[settings.viewportSim].width}px wide. Use Native or run the sweep.`}
              </span>
            ) : null}
          </div>

          <div className="ui-debug-panel-section ui-debug-panel-toggles">
            <label className="ui-debug-check">
              <input
                type="checkbox"
                checked={settings.showBoundaries}
                onChange={(e) => onSetSettings({ showBoundaries: e.target.checked })}
              />
              Boundaries
            </label>
            <label className="ui-debug-check">
              <input
                type="checkbox"
                checked={settings.showSpacing}
                onChange={(e) => onSetSettings({ showSpacing: e.target.checked })}
              />
              Spacing / flex
            </label>
            <label className="ui-debug-check">
              <input
                type="checkbox"
                checked={settings.scanOverflow}
                onChange={(e) => onSetSettings({ scanOverflow: e.target.checked })}
              />
              Overflow scan
            </label>
          </div>

          <div className="ui-debug-panel-actions">
            <button type="button" className="ui-debug-action" onClick={onRescan}>
              Rescan
            </button>
          </div>

          <p className="ui-debug-panel-foot">
            Flags: {Object.values(ISSUE_LABELS).join(" · ")}. Dev only — add{" "}
            <code>?uidebug=1</code> in production.
          </p>
        </div>
      ) : null}
    </div>
  );
}
