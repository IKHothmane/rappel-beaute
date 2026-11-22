"use client";

import { useEffect, useId, useRef } from "react";
import { Sparkles } from "lucide-react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

type TutorialDialogProps = {
  kind: "welcome" | "resume";
  onStart: () => void;
  onLater: () => void;
};

/**
 * Carte de bienvenue (ou de reprise). Dialogue accessible : focus piégé et rendu à l'élément précédent, Échap et clic
 * sur le fond = « Plus tard ». Au-dessus de MobileNav (z-50) et des toasts (z-100/120), compensation du zoom 0.8 via
 * rb-fullscreen-overlay. Non bloquant : rien n'est écrit tant que l'utilisatrice ne choisit pas « Commencer ».
 */
export function TutorialDialog({ kind, onStart, onLater }: TutorialDialogProps) {
  const titleId = useId();
  const descId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const laterRef = useRef(onLater);
  laterRef.current = onLater;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") laterRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  function trapFocus(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const resume = kind === "resume";

  return (
    <div
      data-rb-tutorial
      className="rb-fullscreen-overlay fixed z-[150] flex items-end justify-center bg-[#261524]/45 p-4 backdrop-blur-[1px] sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onLater();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onKeyDown={trapFocus}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#F0D9E3] bg-white p-6 text-[#261524] shadow-2xl motion-safe:animate-[app-tour-in_180ms_ease-out_both]"
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0F6] text-[#AC0E4C]">
          <Sparkles size={22} aria-hidden />
        </div>
        <h2 id={titleId} className="font-display text-xl font-semibold text-[#58152F]">
          {resume ? "Reprenons votre configuration" : "Bienvenue sur Rappel Beauty !"}
        </h2>
        <p id={descId} className="mt-2 text-sm leading-6 text-[#654254]">
          {resume
            ? "Votre tutoriel est en pause. Reprenez-le là où vous vous étiez arrêtée pour finir de configurer votre institut."
            : "Configurons ensemble votre institut pour recevoir vos premiers rendez-vous."}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onLater}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#F0D9E3] bg-white px-4 text-sm font-semibold text-[#7D3152] transition hover:bg-[#FFF1F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC0E4C]"
          >
            Plus tard
          </button>
          <button
            type="button"
            data-autofocus
            onClick={onStart}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#AC0E4C] px-5 text-sm font-bold text-white transition hover:bg-[#820D39] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC0E4C]"
          >
            {resume ? "Reprendre" : "Commencer"}
          </button>
        </div>
      </div>
    </div>
  );
}
