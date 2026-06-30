import { APP_COPY } from "../../lib/appCopy";
import styles from "./LoadingBall.module.css";

export type LoadingBallSize = "xs" | "sm" | "md" | "lg";

type Props = {
  size?: LoadingBallSize;
  className?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
};

export function LoadingBall({
  size = "md",
  className,
  "aria-label": ariaLabel = APP_COPY.splash.loadingAria,
  "aria-hidden": ariaHidden,
}: Props) {
  const sizeClass = styles[size];

  return (
    <div
      className={[styles.ball, sizeClass, className].filter(Boolean).join(" ")}
      role={ariaHidden ? undefined : "status"}
      aria-label={ariaHidden ? undefined : ariaLabel}
      aria-hidden={ariaHidden || undefined}
    />
  );
}
