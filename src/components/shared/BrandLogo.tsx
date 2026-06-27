import { APP_BRAND } from "../../config/appMeta";

type BrandLogoProps = {
  /** Render size in CSS pixels */
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "mark" | "full";
  className?: string;
  alt?: string;
  /** Splash/marketing: hide accent plate and feather into page background */
  blendEdges?: boolean;
};

const SIZE_PX: Record<NonNullable<BrandLogoProps["size"]>, number> = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 128,
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
}: BrandLogoProps) {
  const px = SIZE_PX[size];
  const src = SRC[variant];
  const shellClass = [
    "brand-logo-shell",
    `brand-logo-shell--${size}`,
    `brand-logo-shell--${variant}`,
    blendEdges ? "brand-logo-shell--blend-edges" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={shellClass}>
      {!blendEdges ? <span className="brand-logo-accents" aria-hidden="true" /> : null}
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
