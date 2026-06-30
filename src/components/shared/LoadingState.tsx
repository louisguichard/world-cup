import type { LoadingBallSize } from "./LoadingBall";
import { LoadingBall } from "./LoadingBall";
import styles from "./LoadingState.module.css";

type Props = {
  label?: string;
  size?: LoadingBallSize;
  layout?: "centered" | "inline";
  className?: string;
  "data-testid"?: string;
};

export function LoadingState({
  label,
  size = "md",
  layout = "centered",
  className,
  "data-testid": dataTestId,
}: Props) {
  return (
    <div
      className={[
        styles.root,
        layout === "inline" ? styles.inline : styles.centered,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      data-testid={dataTestId}
    >
      <LoadingBall size={size} aria-hidden />
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}

export function ViewLoadingFallback() {
  return (
    <div className={styles.viewFallback}>
      <LoadingState size="lg" />
    </div>
  );
}

export function SectionLoadingFallback() {
  return (
    <div className={styles.sectionFallback} aria-hidden="true">
      <LoadingState size="md" />
    </div>
  );
}
