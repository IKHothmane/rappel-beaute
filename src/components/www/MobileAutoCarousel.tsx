"use client";

import { Children, useState, type ReactNode } from "react";

type MobileAutoCarouselProps = {
  children: ReactNode;
  /** Durée d'un tour complet (secondes) — plus bas = plus rapide */
  durationSec?: number;
  /** @deprecated préférer durationSec */
  intervalMs?: number;
  className?: string;
  /**
   * Classes du rang (gap, alignement…).
   * Inclure le même pe-* que le gap (ex: "gap-3 pe-3") pour une boucle seamless.
   */
  trackClassName?: string;
  /** Classes pour masquer sur desktop (ex: lg:hidden) */
  hideFrom?: string;
  showDots?: boolean;
  dotsTone?: "primary" | "light";
};

export function MobileAutoCarousel({
  children,
  durationSec,
  intervalMs,
  className = "",
  trackClassName = "gap-3 pe-3",
  hideFrom = "lg:hidden",
}: MobileAutoCarouselProps) {
  const items = Children.toArray(children).filter(Boolean);
  const count = items.length;
  const [paused, setPaused] = useState(false);

  if (count === 0) return null;

  const loopSec =
    durationSec ??
    Math.max(14, ((intervalMs ?? 3200) * Math.max(count, 2)) / 1000);

  return (
    <div
      className={`${hideFrom} ${paused ? "rb-marquee-paused" : ""} ${className}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        window.setTimeout(() => setPaused(false), 1800);
      }}
      aria-roledescription="carrousel"
    >
      <div className="-mx-4 overflow-hidden px-4 sm:-mx-6 sm:px-6">
        <div
          className="rb-marquee-track flex"
          style={{ animationDuration: `${loopSec}s` }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className={`flex shrink-0 ${trackClassName}`}
              aria-hidden={copy === 1}
            >
              {items.map((child, i) => (
                <div key={`${copy}-${i}`} className="shrink-0">
                  {child}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
