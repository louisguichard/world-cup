import { APP_BRAND } from "../../config/appMeta";
import { resolveColorScheme } from "../../lib/colorScheme";
import { tournamentLogoForTheme } from "../../lib/footballLogoUrl";
import { useStore } from "../../store";

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

const MARK_LOGO_SIZE = {
  sm: 64,
  md: 128,
  lg: 256,
  xl: 512,
  hero: 700,
} as const;

function markSrcForTheme(theme: "light" | "dark", size: NonNullable<BrandLogoProps["size"]>): string {
  return tournamentLogoForTheme(theme, MARK_LOGO_SIZE[size], "mark");
}

function markSrcSetForTheme(theme: "light" | "dark", size: NonNullable<BrandLogoProps["size"]>): string | undefined {
  if (size === "hero") return undefined;
  const base = MARK_LOGO_SIZE[size];
  const retina = size === "sm" ? 128 : size === "md" ? 256 : size === "lg" ? 512 : 700;
  return `${tournamentLogoForTheme(theme, base, "mark")} 1x, ${tournamentLogoForTheme(theme, retina, "mark")} 2x`;
}

function fullSrcForTheme(theme: "light" | "dark", size: NonNullable<BrandLogoProps["size"]>): string {
  const logoSize = size === "hero" ? 700 : 512;
  return tournamentLogoForTheme(theme, logoSize, "full");
}

export function BrandLogo({
  size = "md",
  variant = "mark",
  className = "",
  alt = APP_BRAND.logoAlt,
  blendEdges = false,
  celebration = false,
}: BrandLogoProps) {
  const colorScheme = useStore((s) => s.colorScheme);
  const theme = resolveColorScheme(colorScheme);
  const px = SIZE_PX[size];
  const src = variant === "mark" ? markSrcForTheme(theme, size) : fullSrcForTheme(theme, size);
  const srcSet = variant === "mark" ? markSrcSetForTheme(theme, size) : undefined;
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
        srcSet={srcSet}
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
