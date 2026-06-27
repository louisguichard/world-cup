import { APP_COPY } from "../../lib/appCopy";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { usePlatform } from "../../hooks/usePlatform";
import { InstallGuideSheet } from "./InstallGuideSheet";
import styles from "./InstallAppBanner.module.css";

export function InstallAppBanner() {
  const { platform } = usePlatform();
  const {
    showBanner,
    installing,
    guideOpen,
    guideKind,
    install,
    dismiss,
    closeGuide,
  } = usePwaInstall();
  const copy = APP_COPY.pwa;

  if (!showBanner) return null;

  const isDesktop = platform === "desktop";
  const title = copy.installTitle;
  const body = isDesktop ? copy.installBodyDesktop : copy.installBodyMobile;

  return (
    <>
      <aside className={styles.banner} role="region" aria-label={title}>
        <div className={styles.copy}>
          <strong className={styles.title}>{title}</strong>
          <p className={styles.body}>{body}</p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => void install()}
            disabled={installing}
          >
            {installing ? copy.installButtonWorking : copy.installButton}
          </button>
          <button type="button" className={styles.secondary} onClick={dismiss}>
            {copy.dismiss}
          </button>
        </div>
      </aside>
      <InstallGuideSheet open={guideOpen} kind={guideKind} onClose={closeGuide} />
    </>
  );
}
