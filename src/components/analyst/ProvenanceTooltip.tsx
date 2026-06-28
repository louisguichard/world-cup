import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AuthorityLevel = "PRIMARY" | "BACKUP" | "COMPUTED" | "ANALYST_OVERRIDE";

interface Props {
  providerId: string;
  authority: AuthorityLevel;
  field: string;
  ingestedAt: string;
}

export function ProvenanceTooltip({ providerId, authority, field, ingestedAt }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const tooltip = open ? (
    <div
      id={tooltipId}
      role="tooltip"
      className="provenance-tooltip"
      style={{
        position: "fixed",
        top: (triggerRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
        left: triggerRef.current?.getBoundingClientRect().left ?? 0,
      }}
    >
      <dl>
        <div>
          <dt>Provider</dt>
          <dd>{providerId}</dd>
        </div>
        <div>
          <dt>Authority</dt>
          <dd>{authority}</dd>
        </div>
        <div>
          <dt>Field</dt>
          <dd>{field}</dd>
        </div>
        <div>
          <dt>Last ingested</dt>
          <dd>{new Date(ingestedAt).toLocaleString()}</dd>
        </div>
      </dl>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="provenance-trigger"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        ⓘ
      </button>
      {typeof document !== "undefined" ? createPortal(tooltip, document.body) : null}
    </>
  );
}
