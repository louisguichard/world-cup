import { useStore } from "../../store";
import { APP_BRAND } from "../../config/appMeta";
import { AppVersionLabel } from "../shared/AppVersionLabel";

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
      <div className="brand" aria-label={APP_BRAND.name}>
        <span className="brand-mark" aria-hidden="true">
          {APP_BRAND.mark}
        </span>
        <span className="brand-text">
          <strong>{APP_BRAND.shortName}</strong>
          <small>{APP_BRAND.topBarSubtitle}</small>
        </span>
      </div>
      <div className="wc-topbar-meta">
        <AppVersionLabel className="wc-topbar-version" />
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
