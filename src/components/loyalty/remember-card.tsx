"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RememberCard() {
  const router = useRouter();

  useEffect(() => {
    function refreshOnReturn() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => document.removeEventListener("visibilitychange", refreshOnReturn);
  }, [router]);

  return null;
}
