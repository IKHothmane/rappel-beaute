"use client";

import { X } from "lucide-react";

export type TutorialNoticeAction = { label: string; onClick: () => void; primary?: boolean };

type TutorialNoticeProps = {
  message: string;
  tone: "info" | "warning";
  actions?: TutorialNoticeAction[];
  onDismiss: () => void;
};

/**
 * Message discret du tutoriel (élément introuvable, tutoriel terminé…). Jamais bloquant : aucune couche de fond,
 * au-dessus de MobileNav et des toasts. Les avertissements sont annoncés (role="alert"), le reste poliment.
 */
export function TutorialNotice({ message, tone, actions = [], onDismiss }: TutorialNoticeProps) {
  return (
    <div
      data-rb-tutorial
      role={tone === "warning" ? "alert" : "status"}
      className="fixed inset-x-3 bottom-24 z-[10001] mx-auto flex max-w-md flex-col gap-3 rounded-2xl border border-[#F0D9E3] bg-white p-4 pr-12 text-[#261524] shadow-2xl motion-safe:animate-[app-tour-in_180ms_ease-out_both] lg:bottom-6"
    >
      <p className="text-sm leading-6 text-[#654254]">{message}</p>
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={
                action.primary
                  ? "inline-flex min-h-11 items-center rounded-xl bg-[#AC0E4C] px-4 text-sm font-bold text-white hover:bg-[#820D39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC0E4C]"
                  : "inline-flex min-h-11 items-center rounded-xl border border-[#F0D9E3] bg-white px-4 text-sm font-semibold text-[#7D3152] hover:bg-[#FFF1F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC0E4C]"
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fermer le message"
        className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#7D3152] hover:bg-[#FFF1F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AC0E4C]"
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}
