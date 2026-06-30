import { useState } from "react";
import styles from "./GettyHeroImage.module.css";

type Props = {
  imageUrl?: string | null;
  title?: string;
  credit?: string;
  loading?: boolean;
  className?: string;
  aspect?: "wide" | "square";
};

/** Editorial hero frame with Getty attribution. */
export function GettyHeroImage({
  imageUrl,
  title,
  credit = "Getty Images",
  loading,
  className = "",
  aspect = "wide",
}: Props) {
  const [failed, setFailed] = useState(false);

  if (loading && !imageUrl) {
    return <div className={`${styles.frame} ${styles.skeleton} ${styles[aspect]} ${className}`.trim()} aria-hidden />;
  }

  if (!imageUrl || failed) {
    return (
      <div
        className={`${styles.frame} ${styles.fallback} ${styles[aspect]} ${className}`.trim()}
        role="img"
        aria-label={title ?? "Venue image unavailable"}
      />
    );
  }

  return (
    <figure className={`${styles.frame} ${styles[aspect]} ${className}`.trim()}>
      <img
        src={imageUrl}
        alt={title ?? ""}
        className={styles.img}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <figcaption className={styles.credit}>{credit}</figcaption>
    </figure>
  );
}
