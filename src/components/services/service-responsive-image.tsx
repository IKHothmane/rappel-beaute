"use client";

import { useEffect, useState } from "react";
import { serviceImageUrls } from "@/lib/images/service-image-urls";

type Variant = "thumb" | "main";

type Props = {
  imageUrl: string;
  alt: string;
  variant?: Variant;
  className?: string;
  priority?: boolean;
  onError?: () => void;
};

/**
 * Sert la miniature (400×300) ou l’image principale (800×600).
 * Si la miniature n’existe pas (anciens uploads), retombe sur l’image principale.
 */
export function ServiceResponsiveImage({
  imageUrl,
  alt,
  variant = "thumb",
  className,
  priority = false,
  onError,
}: Props) {
  const { main, thumb } = serviceImageUrls(imageUrl);
  const preferred = variant === "thumb" ? thumb : main;
  const [src, setSrc] = useState(preferred);
  const width = variant === "thumb" ? 400 : 800;
  const height = variant === "thumb" ? 300 : 600;

  useEffect(() => {
    setSrc(preferred);
  }, [preferred]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onError={() => {
        if (src !== main) {
          setSrc(main);
          return;
        }
        onError?.();
      }}
    />
  );
}
