import styles from "./CertaintyBadge.module.css";

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

function badgeLabel(certainty: CertaintyBadgeVariant): string {
  switch (certainty) {
    case "confirmed":
      return "Confirmed";
    case "projected":
      return "Projected";
    case "projected_strong":
      return "Leading";
    case "projected_weak":
      return "On track";
    case "simulated":
      return "Simulated";
    case "tbd":
      return "TBD";
    default: {
      const _exhaustive: never = certainty;
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
