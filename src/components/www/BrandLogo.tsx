import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  /** Hauteur du logo en px (header ≈ 44–52, footer ≈ 64–80) */
  height?: number;
  className?: string;
  href?: string;
  priority?: boolean;
};

/** Logo officiel — /public/brand/logo.png */
export function BrandLogo({
  height = 48,
  className = "",
  href = "/",
  priority = false,
}: BrandLogoProps) {
  // Ratio approximatif du lockup carré (logo + textes)
  const width = Math.round(height * 1.05);

  const img = (
    <Image
      src="/brand/logo.png"
      alt="Rappel Beauty — Gérez, réservez, développez"
      width={width}
      height={height}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height, width: "auto" }}
      priority={priority}
    />
  );

  if (!href) return img;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="Rappel Beauty — Accueil">
      {img}
    </Link>
  );
}
