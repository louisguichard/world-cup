import type { ReactNode } from "react";
import { UI_DEBUG_VIEWPORTS, type ViewportSimulation } from "../../lib/uiDebug";
import type { UiDebugSettings } from "../../lib/uiDebug";

type Props = {
  settings: UiDebugSettings;
  children: ReactNode;
};

export function UiDebugViewportShell({ settings, children }: Props) {
  const { enabled, viewportSim } = settings;

  if (!enabled || viewportSim === "native") {
    return <>{children}</>;
  }

  const preset = UI_DEBUG_VIEWPORTS[viewportSim];

  return (
    <div className="ui-debug-viewport-stage">
      <div
        className="ui-debug-viewport-frame"
        style={{
          width: preset.width,
          minHeight: preset.height,
        }}
        data-ui-debug-frame={viewportSim}
      >
        {children}
      </div>
    </div>
  );
}

export function viewportFrameLabel(sim: ViewportSimulation): string {
  if (sim === "native") return "Native viewport";
  const preset = UI_DEBUG_VIEWPORTS[sim];
  return `${preset.label} · ${preset.width}×${preset.height}`;
}
