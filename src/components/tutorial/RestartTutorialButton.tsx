"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useTutorialRestart } from "./tutorial-restart";

export function RestartTutorialButton({
  children,
  onBeforeStart,
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "onClick" | "type"> & {
  onBeforeStart?: () => void;
}) {
  const restart = useTutorialRestart();
  const busy = restart?.status === "queued" || restart?.status === "running";
  return (
    <button
      {...props}
      type="button"
      aria-busy={busy || undefined}
      aria-disabled={busy || !restart || undefined}
      onClick={() => {
        if (busy || !restart) return;
        onBeforeStart?.();
        restart.request();
      }}
    >
      {children ?? "Revoir le tutoriel"}
    </button>
  );
}
