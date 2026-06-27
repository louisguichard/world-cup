import { useState } from "react";
import type { ModuleId } from "../../lib/moduleIds";
import { refreshModule } from "../../lib/moduleRefreshActions";

type Props = {
  moduleId: ModuleId;
  label?: string;
  className?: string;
};

export function ModuleRefreshButton({ moduleId, label = "Refresh", className = "" }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className={`module-refresh-btn${className ? ` ${className}` : ""}`}
      aria-label={label}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void refreshModule(moduleId).finally(() => setBusy(false));
      }}
    >
      <span className={busy ? "module-refresh-btn__icon is-spinning" : "module-refresh-btn__icon"} aria-hidden>
        ↻
      </span>
    </button>
  );
}
