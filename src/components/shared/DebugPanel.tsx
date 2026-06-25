import { useState } from "react";
import { logger } from "../../services/Logger";

export function DebugPanel() {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) {
    return null;
  }

  const logs = logger.getBuffer().slice(-20).reverse();

  return (
    <div className="debug-panel">
      <button type="button" className="debug-panel-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide logs" : "Debug"}
      </button>
      {open ? (
        <div className="debug-panel-body">
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
