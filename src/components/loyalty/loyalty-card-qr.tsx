"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy, Maximize2, X } from "lucide-react";

type Props = {
  qr: string;
  alt: string;
  /** Code court (4 caractères) servant de référence de la carte. */
  code?: string | null;
};

/** QR personnel : grand, très contrasté, agrandissable plein écran, avec code court copiable. */
export function LoyaltyCardQr({ qr, alt, code }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function close() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied("done");
    } catch {
      // Presse-papiers refusé : on sélectionne le code pour une copie manuelle.
      const node = document.getElementById(`${titleId}-code`);
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setCopied("failed");
    }
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Agrandir mon QR code"
        className="mx-auto block w-full max-w-[15rem] rounded-xl border-2 border-[#3A2533] bg-white p-1.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#A83E70]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt={alt}
          width={512}
          height={512}
          className="block h-auto w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </button>

      <button
        type="button"
        onClick={open}
        className="mx-auto mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7B9CD] bg-[#FFF8FB] px-4 text-sm font-semibold text-[#8F3360] transition hover:bg-[#FCE9F2] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#A83E70]"
      >
        <Maximize2 size={16} aria-hidden="true" />
        Agrandir le QR
      </button>

      {code ? (
        <div className="mt-4 border-t border-[#F0DDE7] pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5763]">
            Code de votre carte
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <span
              id={`${titleId}-code`}
              aria-label={code.split("").join(" ")}
              className="select-all font-mono text-3xl font-bold tracking-[0.28em] text-[#3A2533]"
            >
              {code}
            </span>
            <button
              type="button"
              onClick={copy}
              aria-label="Copier le code de la carte"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7B9CD] bg-white px-4 text-sm font-semibold text-[#8F3360] transition hover:bg-[#FCE9F2] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#A83E70]"
            >
              {copied === "done" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied === "done" ? "Copié" : "Copier"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[#6B5763]">
            Présentez le QR ci-dessus à l’institut pour valider un passage.
          </p>
          <p role="status" aria-live="polite" className="min-h-4 text-xs font-semibold text-[#14804A]">
            {copied === "done" ? "Code copié" : copied === "failed" ? "Copie impossible : le code est sélectionné." : ""}
          </p>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${titleId}-title`}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[94dvh] w-[min(94vw,26rem)] overflow-y-auto overscroll-contain rounded-3xl border-0 bg-white p-5 text-center text-[#3A2533] shadow-2xl backdrop:bg-[#241019]/85"
      >
        <div className="flex items-start justify-between gap-3">
          <p id={`${titleId}-title`} className="text-left text-base font-extrabold leading-snug">
            Présentez ce QR à l’institut
          </p>
          <button
            type="button"
            onClick={close}
            autoFocus
            aria-label="Fermer le QR agrandi"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E7B9CD] bg-white text-[#8F3360] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#A83E70]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt={alt}
          width={512}
          height={512}
          className="mx-auto mt-3 block h-auto w-full max-w-[22rem] rounded-xl border-2 border-[#3A2533] bg-white p-2"
          style={{ imageRendering: "pixelated" }}
        />
        {code ? (
          <p className="mt-3 font-mono text-2xl font-bold tracking-[0.28em]">{code}</p>
        ) : null}
        <p className="mt-2 text-sm text-[#6B5763]">
          Augmentez la luminosité de votre écran pour faciliter la lecture.
        </p>
      </dialog>
    </div>
  );
}
