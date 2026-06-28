import { useEffect, useState } from "react";

interface Props {
  value: number;
  baseline?: number;
  label: string;
}

export function ProbabilityBar({ value, baseline, label }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const delta =
    baseline !== undefined ? Math.round((value - baseline) * 100) : undefined;
  const [flash, setFlash] = useState(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (delta === undefined || delta === 0 || reducedMotion) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 5000);
    return () => clearTimeout(t);
  }, [delta, reducedMotion, value]);

  return (
    <div className="probability-bar">
      <div
        className={`probability-bar__track${flash ? " probability-bar__track--flash" : ""}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div className="probability-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      {delta !== undefined && delta !== 0 ? (
        <span
          className={`probability-bar__delta probability-bar__delta--${
            delta > 0 ? "up" : "down"
          }`}
          aria-label={`Change ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} percent`}
        >
          {reducedMotion ? `${delta > 0 ? "+" : ""}${delta}%` : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}%`}
        </span>
      ) : null}
    </div>
  );
}
