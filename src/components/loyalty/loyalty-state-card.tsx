import type { ReactNode } from "react";

/** Écran d'état plein cadre (carte introuvable, erreur) : même univers rose/prune que la carte. */
export function LoyaltyStateCard({
  icon,
  title,
  children,
  actions,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-[60vh] bg-vt-surface px-4 py-10 sm:py-16">
      <section className="mx-auto max-w-[28rem] rounded-3xl border border-[#F0DDE7] bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FCE9F2] text-[#A83E70]" aria-hidden="true">
          {icon}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#8A4466]">Carte de fidélité</p>
        <h1 className="mt-2 !font-semibold !tracking-normal font-display text-2xl leading-tight text-[#3A2533] [overflow-wrap:anywhere]">{title}</h1>
        <div className="mt-3 space-y-2 text-base text-[#5E4A56]">{children}</div>
        {actions ? <div className="mt-6 flex flex-col gap-3">{actions}</div> : null}
      </section>
    </div>
  );
}
