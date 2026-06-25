import { useState } from "react";
import { API_SOURCES, BOOTSTRAP_FLAGS, listDisabledApis } from "../../config/apiFlags";
import { logger } from "../../services/Logger";

export function DebugPanel() {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) {
    return null;
  }

  const logs = logger.getBuffer().slice(-20).reverse();
  const disabled = listDisabledApis();

  return (
    <div className="debug-panel">
      <button type="button" className="debug-panel-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide logs" : "Debug"}
      </button>
      {open ? (
        <div className="debug-panel-body">
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
