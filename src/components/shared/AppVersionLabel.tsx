import { APP_BRAND, formatVersionCompact, formatVersionLabel } from "../../config/appMeta";
import styles from "./AppVersionLabel.module.css";

type Props = {
  variant?: "compact" | "full";
  className?: string;
};

export function AppVersionLabel({ variant = "compact", className }: Props) {
  const text = variant === "compact" ? formatVersionCompact() : formatVersionLabel();

  return (
    <span
      className={`${styles.version} ${className ?? ""}`}
      title={`${APP_BRAND.name} — ${formatVersionLabel()}`}
      aria-label={`Application version ${formatVersionLabel()}`}
    >
      {text}
    </span>
  );
}
