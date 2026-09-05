import Link from "next/link";
import { PLANS } from "@/lib/site";

export function PricingSection({ headingId = "tarifs" }: { headingId?: string }) {
  return (
    <section id={headingId} className="scroll-mt-24 py-20 md:py-28">
      <div className="container-rb">
        <p className="eyebrow">Tarifs</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Trois plans, en MAD, sans surprise.
        </h2>
        <p className="mt-3 max-w-lg text-ink/65">
          14 jours pour essayer, sans carte bancaire. Votre accès est activé sous
          24 h — pas de création libre en V1.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const dark = plan.variant === "dark";
            const rose = plan.variant === "rose";

            return (
              <article
                key={plan.id}
                className={
                  dark
                    ? "relative flex flex-col rounded-xl border border-[#171018] bg-institut px-6 py-8 text-white shadow-mock"
                    : rose
                      ? "relative flex flex-col rounded-xl border-2 border-primary bg-white px-6 py-8 shadow-soft"
                      : "relative flex flex-col rounded-xl border border-line bg-white px-6 py-8 shadow-soft"
                }
              >
                {"share" in plan ? (
                  <span className="absolute -top-3 left-6 rounded-md bg-gold px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#171018]">
                    {plan.share === "recommandé" ? "Recommandé" : `Populaire · ${plan.share}`}
                  </span>
                ) : null}

                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className={`mt-4 font-mono text-4xl font-semibold tabular-nums ${dark ? "text-white" : "text-ink"}`}>
                  {plan.price}
                  <span className={`ml-1 text-sm font-medium ${dark ? "text-white/50" : "text-ink/40"}`}>
                    MAD
                  </span>
                </p>
                <p className={`mt-1 text-sm ${dark ? "text-white/55" : "text-ink/55"}`}>
                  / mois · {plan.quota} · {plan.sites}
                </p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`text-sm ${dark ? "text-white/80" : "text-ink/75"}`}
                    >
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/essai/?plan=${plan.id}`}
                  className={
                    dark
                      ? "mt-8 inline-flex items-center justify-center rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[#171018] transition hover:brightness-110"
                      : rose
                        ? "btn-primary mt-8"
                        : "btn-ghost mt-8"
                  }
                >
                  Demander l’essai
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
