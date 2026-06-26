import { useStore } from "../../store";

export function TopNavBar({ hidden = false }: { hidden?: boolean }) {
  const lastPollAt = useStore((s) => s.lastPollAt);
  const liveCount = useStore((s) => {
    let count = 0;
    for (const match of Object.values(s.liveMatches)) {
      if (match.status === "live") count += 1;
    }
    return count;
  });

  if (hidden) return null;

  return (
    <header className="wc-topbar">
      <div className="brand" aria-label="Road to the World Cup Final 2026">
        <span className="brand-mark" aria-hidden="true">
          WC
        </span>
        <span className="brand-text">
          <strong>Road to the Final</strong>
          <small>WORLD CUP 2026</small>
        </span>
      </div>
      <div className="wc-topbar-meta">
        {liveCount > 0 ? (
          <span className="stat-chip">
            <span className="live-pill-dot" aria-hidden />
            <b>{liveCount}</b> live
          </span>
        ) : null}
        {lastPollAt ? (
          <span className="updated-at">
            Updated {new Date(lastPollAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </span>
        ) : null}
      </div>
    </header>
  );
}
