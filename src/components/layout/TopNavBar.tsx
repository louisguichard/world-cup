import { useStore } from "../../store";
import { APP_BRAND } from "../../config/appMeta";
import { APP_COPY } from "../../lib/appCopy";
import { navigateHome } from "../../lib/navigateToTab";
import { AppVersionLabel } from "../shared/AppVersionLabel";
import { BrandLogo } from "../shared/BrandLogo";
import { ThemeToggle } from "../shared/ThemeToggle";

export function TopNavBar({ compact = false }: { compact?: boolean }) {
  const lastPollAt = useStore((s) => s.lastPollAt);
  const liveCount = useStore((s) => {
    let count = 0;
    for (const match of Object.values(s.liveMatches)) {
      if (match.status === "live") count += 1;
    }
    return count;
  });

  return (
    <header className={`wc-topbar${compact ? " wc-topbar--compact" : ""}`}>
      <div className="fwc-unify-stripe" aria-hidden="true" />
      <div className="wc-topbar-inner">
        <button
          type="button"
          className="brand brand-home-btn"
          onClick={navigateHome}
          aria-label={`${APP_BRAND.name} — ${APP_COPY.tabs.live}`}
        >
          <span className="brand-mark brand-mark--logo" aria-hidden="true">
            <BrandLogo size="md" variant="mark" alt="" />
          </span>
          <span className="brand-text">
            <strong>{APP_BRAND.shortName}</strong>
            {!compact ? <small>{APP_BRAND.topBarSubtitle}</small> : null}
          </span>
        </button>
        <div className="wc-topbar-meta">
          <ThemeToggle compact />
          <AppVersionLabel className="wc-topbar-version" />
          {liveCount > 0 ? (
            <span className="stat-chip">
              <span className="live-pill-dot" aria-hidden />
              {APP_COPY.topBar.liveCount(liveCount)}
            </span>
          ) : null}
          {lastPollAt ? (
            <span className="updated-at">
              {APP_COPY.topBar.updated(
                new Date(lastPollAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
              )}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
