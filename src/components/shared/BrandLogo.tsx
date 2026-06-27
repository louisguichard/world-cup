import { APP_BRAND } from "../../config/appMeta";

type BrandLogoProps = {
  /** Render size in CSS pixels */
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  variant?: "mark" | "full";
  className?: string;
  alt?: string;
  /** Splash/marketing: hide accent plate and feather into page background */
  blendEdges?: boolean;
  /** Splash hero: big tournament-color celebration halos */
  celebration?: boolean;
};

const SIZE_PX: Record<NonNullable<BrandLogoProps["size"]>, number> = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 128,
  hero: 220,
};

const SRC: Record<NonNullable<BrandLogoProps["variant"]>, string> = {
  mark: APP_BRAND.logoMark,
  full: APP_BRAND.logoFull,
};

export function BrandLogo({
  size = "md",
  variant = "mark",
  className = "",
  alt = APP_BRAND.logoAlt,
  blendEdges = false,
  celebration = false,
}: BrandLogoProps) {
  const px = SIZE_PX[size];
  const src = SRC[variant];
  const showAccents = celebration || !blendEdges;
  const shellClass = [
    "brand-logo-shell",
    `brand-logo-shell--${size}`,
    `brand-logo-shell--${variant}`,
    blendEdges && !celebration ? "brand-logo-shell--blend-edges" : "",
    celebration ? "brand-logo-shell--celebration" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={shellClass}>
      {showAccents ? (
        <span
          className={`brand-logo-accents${celebration ? " brand-logo-accents--celebration" : ""}`}
          aria-hidden="true"
        />
      ) : null}
      <img
        src={src}
        srcSet={variant === "mark" ? `${APP_BRAND.logoMark} 1x, /logo/wc-trophy-mark@2x.png 2x` : undefined}
        alt={alt}
        className={`brand-logo brand-logo--${size} brand-logo--${variant}`}
        width={px}
        height={px}
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
