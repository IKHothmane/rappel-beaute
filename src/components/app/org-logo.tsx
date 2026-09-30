"use client";

import { BrandLogo } from "@/components/www/BrandLogo";
import { cn } from "@/lib/utils";

type Props = {
  url?: string | null;
  name: string;
  size?: number;
  className?: string;
};

export function OrgLogo({ url, name, size = 40, className }: Props) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-lg bg-[#FBF4F6] object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return <BrandLogo href={null} height={size} className={cn("max-h-10 shrink-0", className)} />;
}
