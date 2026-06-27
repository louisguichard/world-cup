import { useEffect, useState } from "react";
import { formatKickoffCountdown } from "../lib/kickoffCountdown";

/** Live countdown string until kickoff (updates every second). */
export function useKickoffCountdown(kickoffIso: string | undefined, active = true): string {
  const [label, setLabel] = useState(() =>
    kickoffIso ? formatKickoffCountdown(kickoffIso) : ""
  );

  useEffect(() => {
    if (!kickoffIso || !active) return;

    const tick = () => setLabel(formatKickoffCountdown(kickoffIso));
    tick();

    const id = setInterval(tick, 1000);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [kickoffIso, active]);

  return label;
}
