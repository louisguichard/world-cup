import { useState } from "react";
import styles from "./PlayerPhoto.module.css";

export type PlayerPhotoSize = "xs" | "sm" | "md" | "lg";

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: PlayerPhotoSize;
  className?: string;
  loading?: boolean;
};

const SIZE_CLASS: Record<PlayerPhotoSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const FALLBACK_FONT: Record<PlayerPhotoSize, string> = {
  xs: styles.fallbackSizeXs,
  sm: styles.fallbackSizeSm,
  md: styles.fallbackSizeMd,
  lg: styles.fallbackSizeMd,
};

function initialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

/** Roster portrait from WC2026 `image` field — lazy, non-blocking, initials fallback. */
export function PlayerPhoto({
  name,
  photoUrl,
  size = "sm",
  className = "",
  loading = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = SIZE_CLASS[size];

  if (loading) {
    return (
      <span
        className={`${styles.photo} ${sizeClass} ${styles.skeleton} ${className}`.trim()}
        aria-hidden
      />
    );
  }

  if (photoUrl && !imageFailed) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${styles.photo} ${sizeClass} ${className}`.trim()}
        loading="lazy"
        decoding="async"
        width={size === "lg" ? 36 : size === "md" ? 56 : size === "sm" ? 24 : 20}
        height={size === "lg" ? 36 : size === "md" ? 56 : size === "sm" ? 24 : 20}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${styles.photo} ${sizeClass} ${styles.fallback} ${FALLBACK_FONT[size]} ${className}`.trim()}
      aria-hidden
    >
      {initialFromName(name)}
    </span>
  );
}
