import { useMemo, useState } from "react";
import { API_SOURCES, BOOTSTRAP_FLAGS, listDisabledApis } from "../../config/apiFlags";
import { formatVersionLabel } from "../../config/appMeta";
import { isBootDebugEnabled } from "../../lib/bootProfile";
import { formatBootReport, getBootMetrics } from "../../lib/bootMetrics";
import { logger } from "../../services/Logger";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const showPanel = isBootDebugEnabled();
  const logs = logger.getBuffer().slice(-20).reverse();
  const disabled = listDisabledApis();
  const boot = useMemo(() => getBootMetrics(), [open, logs.length]);

  if (!showPanel) {
    return null;
  }

  return (
    <div className="debug-panel">
      <button type="button" className="debug-panel-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide logs" : "Debug"}
      </button>
      {open ? (
        <div className="debug-panel-body">
          <div className="debug-log debug-log--info">
            <span className="debug-log-module">release</span>
            <span className="debug-log-msg">{formatVersionLabel()}</span>
          </div>
          <div className="debug-log debug-log--info">
            <span className="debug-log-module">boot</span>
            <span className="debug-log-msg">
              {boot.totalMs != null ? `${boot.totalMs}ms total` : "boot in progress"} ·{" "}
              {boot.mobileFastPath ? "mobile fast path" : "full path"}
              {boot.navigation?.firstContentfulPaint != null
                ? ` · FCP ${boot.navigation.firstContentfulPaint}ms`
                : ""}
            </span>
          </div>
          {boot.phases.map((phase) => (
            <div key={`${phase.id}-${phase.startedAt}`} className="debug-log debug-log--info">
              <span className="debug-log-module">{phase.durationMs}ms</span>
              <span className="debug-log-msg">
                {phase.label}
                {phase.detail ? ` — ${phase.detail}` : ""}
              </span>
            </div>
          ))}
          <div className="debug-log debug-log--info">
            <span className="debug-log-module">boot report</span>
            <span className="debug-log-msg">{formatBootReport(boot)}</span>
          </div>
          <div className="debug-log debug-log--info">
            <span className="debug-log-module">apiFlags</span>
            <span className="debug-log-msg">
              Disabled: {disabled.map((d) => d.label).join(", ") || "none"} · enrichment=
              {String(BOOTSTRAP_FLAGS.backgroundEnrichment)} · sim={String(BOOTSTRAP_FLAGS.bootstrapSimulation)}
            </span>
          </div>
          {Object.values(API_SOURCES).map((source) => (
            <div key={source.label} className={`debug-log debug-log--${source.lastAudit === "pass" ? "info" : "warn"}`}>
              <span className="debug-log-module">{source.enabled ? "on" : "off"}</span>
              <span className="debug-log-msg">
                {source.label} ({source.lastAudit}, {source.lastLatencyMs}ms)
                {source.disableReason ? ` — ${source.disableReason}` : ""}
              </span>
            </div>
          ))}
          {logs.map((entry) => (
            <div key={entry.id} className={`debug-log debug-log--${entry.level}`}>
              <span className="debug-log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span className="debug-log-module">{entry.module}</span>
              <span className="debug-log-msg">{entry.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
