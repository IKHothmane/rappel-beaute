import Image from "next/image";
import Link from "next/link";
import { PUBLIC_OFFER } from "@/lib/site";

export function HomeHero() {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-line bg-cover bg-center"
      style={{ backgroundImage: "url('/marketing/hero-background.png')" }}
    >
      <div className="absolute inset-0 bg-white/20" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-16">
        <div className="rb-enter relative z-10 min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e9c9a0] bg-white/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98723b] shadow-sm sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Espace professionnels &amp; instituts
          </span>

          <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.35rem]">
            Le logiciel de gestion pour les{" "}
            <span className="text-primary">instituts de beauté</span> au Maroc.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-ink/75 sm:text-base">
            Rendez-vous, planning, clientes, stock, caisse, fidélité et réservation en ligne.
            Un seul logiciel pensé pour les instituts de beauté au Maroc.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/professionnel/"
              className="rb-button inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-900/15 hover:bg-primary-dark"
            >
              Essayer gratuitement {PUBLIC_OFFER.trialDays} jours <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#logiciel"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/90 bg-white/85 px-6 py-3.5 text-sm font-semibold text-ink shadow-sm backdrop-blur hover:border-primary/40"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fce7ef] text-primary" aria-hidden="true">
                ▶
              </span>
              Voir le logiciel
            </Link>
          </div>

          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/70 sm:text-sm">
            <span>✓ {PUBLIC_OFFER.trialDays} jours gratuits</span>
            <span>✓ Sans carte bancaire</span>
            <span>✓ Sans engagement</span>
          </p>
        </div>

        <figure className="rb-visual rb-float relative mx-auto w-full min-w-0 max-w-2xl">
          <Image
            src="/marketing/laptop-rappelbeauty.png"
            alt="Logiciel de gestion Rappel Beauty sur ordinateur"
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-auto w-full object-contain"
          />
        </figure>
      </div>
    </section>
  );
}
