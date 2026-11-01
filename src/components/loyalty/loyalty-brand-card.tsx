import type { ReactNode } from "react";
import { Crown } from "lucide-react";

type Props = {
  organizationName: string;
  programName?: string | null;
  backgroundUrl?: string | null;
  /** Passages du cycle en cours ; null = pas de cliente affichée */
  cycleVisits: number | null;
  threshold: number | null;
  /** Texte du bloc « Prochaine récompense » / « Code promo » */
  highlightLabel: string;
  highlightValue: string;
  qrSrc: string | null;
  qrAlt: string;
  qrEmpty?: string;
  footerTitle: string;
  footerSubtitle?: string;
  /** Code court de la carte (affiché sous le QR) */
  code?: string | null;
  emptyHint?: string;
  action?: ReactNode;
};

/** Carte de fidélité : même rendu côté institut et côté cliente (fond choisi par l'admin). */
export function LoyaltyBrandCard({
  organizationName,
  programName,
  backgroundUrl,
  cycleVisits,
  threshold,
  highlightLabel,
  highlightValue,
  qrSrc,
  qrAlt,
  qrEmpty = "Aucun QR",
  footerTitle,
  footerSubtitle,
  code,
  emptyHint = "Choisissez une cliente fidèle pour afficher sa carte.",
  action,
}: Props) {
  const shown = cycleVisits != null && threshold != null && threshold > 0;
  const filled = shown ? Math.min(threshold, Math.max(0, cycleVisits)) : 0;

  return (
    <article
      className="relative min-w-0 overflow-hidden rounded-3xl p-4 text-white shadow-md sm:p-6"
      style={{
        background: backgroundUrl
          ? `linear-gradient(180deg, rgba(18, 8, 12, 0.2), rgba(18, 8, 12, 0.35)), url("${backgroundUrl}") center / cover no-repeat`
          : "linear-gradient(145deg, #4A1024 0%, #7A1838 48%, #3A0E1E 100%)",
      }}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Crown className="text-[#E8C56B]" size={22} />
          <p className="mt-2 break-words font-display text-[18px] uppercase leading-tight tracking-[0.08em] text-[#E8C56B] sm:mt-3 sm:text-[26px] sm:tracking-[0.14em]">
            {organizationName}
          </p>
          {programName && programName !== organizationName ? (
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-white/55">{programName}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-right text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-white/70">
          Carte
          <br />
          fidélité
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-white/70">Vos passages</p>
          <p className="mt-1 text-[26px] font-semibold leading-none sm:text-[28px]">
            {shown ? `${cycleVisits} / ${threshold}` : "—"}
          </p>
          {shown ? (
            <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
              {Array.from({ length: Math.min(threshold, 12) }, (_, index) => (
                <span
                  key={index}
                  className={
                    index < Math.min(filled, 12)
                      ? "h-2.5 w-2.5 rounded-full bg-[#E8C56B] sm:h-3.5 sm:w-3.5"
                      : "h-2.5 w-2.5 rounded-full border border-white/40 sm:h-3.5 sm:w-3.5"
                  }
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-white/60">{emptyHint}</p>
          )}
        </div>
        <div className="flex min-w-0 items-end gap-3">
          <div className="min-w-0 flex-1 rounded-2xl bg-black/25 px-3 py-2 sm:flex-none">
            <p className="text-[11px] text-[#E8C56B]">{highlightLabel}</p>
            <p className="truncate text-sm font-semibold">{highlightValue || "—"}</p>
          </div>
          <div className="shrink-0 text-center">
            <div className="rounded-xl bg-white p-1.5">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt={qrAlt} className="h-16 w-16 sm:h-20 sm:w-20" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center text-center text-[10px] leading-tight text-ink/50 sm:h-20 sm:w-20">
                  {qrEmpty}
                </div>
              )}
            </div>
            {code ? (
              <p className="mt-1 font-mono text-[12px] font-bold tracking-[0.18em] text-[#E8C56B]">{code}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-white/15 pt-4 sm:mt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold sm:text-lg">{footerTitle}</p>
          {footerSubtitle ? <p className="truncate text-sm text-white/70">{footerSubtitle}</p> : null}
        </div>
        {action}
      </div>
    </article>
  );
}
