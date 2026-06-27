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
  if (loading && !imageUrl) {
    return <div className={`${styles.frame} ${styles.skeleton} ${styles[aspect]} ${className}`.trim()} aria-hidden />;
  }

  if (!imageUrl) return null;

  return (
    <figure className={`${styles.frame} ${styles[aspect]} ${className}`.trim()}>
      <img
        src={imageUrl}
        alt={title ?? ""}
        className={styles.img}
        loading="lazy"
        decoding="async"
      />
      <figcaption className={styles.credit}>{credit}</figcaption>
    </figure>
  );
}
