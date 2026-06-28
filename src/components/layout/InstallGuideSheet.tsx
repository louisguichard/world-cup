import { APP_COPY } from "../../lib/appCopy";
import type { InstallGuideKind } from "../../lib/pwaInstallController";
import styles from "./InstallGuideSheet.module.css";

type Props = {
  open: boolean;
  kind: InstallGuideKind;
  onClose: () => void;
};

function guideCopy(kind: InstallGuideKind) {
  const g = APP_COPY.pwa.guide;
  switch (kind) {
    case "ios":
      return g.ios;
    case "android":
      return g.android;
    case "desktop-chrome":
      return g.desktopChrome;
    case "desktop-safari":
      return g.desktopSafari;
    case "desktop-other":
      return g.desktopOther;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function InstallGuideSheet({ open, kind, onClose }: Props) {
  if (!open) return null;

  const copy = guideCopy(kind);
  const pwa = APP_COPY.pwa;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-guide-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="install-guide-title" className={styles.title}>
            {copy.title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={pwa.guide.close}>
            ×
          </button>
        </header>
        <p className={styles.lead}>{copy.lead}</p>
        <ol className={styles.steps}>
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button type="button" className={styles.done} onClick={onClose}>
          {pwa.guide.done}
        </button>
      </div>
    </div>
  );
}
