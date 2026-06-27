import styles from "./CertaintyBadge.module.css";
import { APP_COPY } from "../../lib/appCopy";

const certaintyCopy = APP_COPY.certainty;

export type CertaintyBadgeVariant =
  | "confirmed"
  | "projected"
  | "projected_strong"
  | "projected_weak"
  | "simulated"
  | "tbd";

export interface CertaintyBadgeProps {
  certainty: CertaintyBadgeVariant;
  size?: "sm" | "xs";
}

function badgeLabel(variant: CertaintyBadgeVariant): string {
  switch (variant) {
    case "confirmed":
      return certaintyCopy.confirmed;
    case "projected":
      return certaintyCopy.projected;
    case "projected_strong":
      return certaintyCopy.projectedStrong;
    case "projected_weak":
      return certaintyCopy.projectedWeak;
    case "simulated":
      return certaintyCopy.simulated;
    case "tbd":
      return certaintyCopy.tbd;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function badgeIcon(certainty: CertaintyBadgeVariant): string | null {
  switch (certainty) {
    case "confirmed":
      return "✓";
    case "projected":
    case "projected_strong":
    case "projected_weak":
    case "simulated":
      return "~";
    case "tbd":
      return null;
    default: {
      const _exhaustive: never = certainty;
      return _exhaustive;
    }
  }
}

export function CertaintyBadge({ certainty, size = "sm" }: CertaintyBadgeProps) {
  const icon = badgeIcon(certainty);
  const sizeClass = size === "xs" ? styles.xs : styles.sm;
  const variantClass =
    certainty === "confirmed"
      ? styles.confirmed
      : certainty === "projected" || certainty === "projected_strong"
        ? styles.projected
        : certainty === "projected_weak"
          ? styles.onTrack
          : certainty === "simulated"
            ? styles.simulated
            : styles.tbd;

  return (
    <span className={`${styles.badge} ${sizeClass} ${variantClass}`}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{badgeLabel(certainty)}</span>
    </span>
  );
}
