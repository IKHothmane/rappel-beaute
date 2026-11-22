"use client";

import type { ReactNode } from "react";
import { restartTutorial } from "./events";

/** Bouton « Revoir le tutoriel » : relance le parcours via l'événement écouté par TutorialHost (réservé au propriétaire). */
export function RestartTutorialButton({
  className,
  children,
  onBeforeStart,
}: {
  className?: string;
  children?: ReactNode;
  onBeforeStart?: () => void;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onBeforeStart?.();
        restartTutorial();
      }}
    >
      {children ?? "Revoir le tutoriel"}
    </button>
  );
}
