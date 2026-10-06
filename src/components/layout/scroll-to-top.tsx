"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (window.location.hash) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }, [pathname]);

  return null;
}
