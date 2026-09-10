import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Fonctionnalités — Logiciel tout-en-un pour instituts",
  description:
    "Rendez-vous, clientes, caisse, stock, fidélité, WhatsApp et rapports. Ancres SEO prêtes à partager et rigueur comptable infaillible.",
};

const PILLS = [
  { id: "rdv", label: "Rendez-vous" },
  { id: "clientes", label: "Clientes" },
  { id: "caisse", label: "Caisse & paiements" },
  { id: "stock", label: "Stock" },
  { id: "fidelite", label: "Fidélité" },
  { id: "promotions", label: "Promotions" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "avis", label: "Avis" },
  { id: "analytics", label: "Analytics & rapports" },
] as const;

function Point({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

function DemoLink() {
  return (
    <Link
      href="/demo/"
      className="group inline-flex items-center text-sm font-bold text-primary hover:text-primary-dark"
    >
      Voir dans une démo
      <span className="ml-1.5 transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

function FeatureBadge({ n, label }: { n: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-xs text-primary">
        {n}
      </span>
      {label}
    </div>
  );
}

export default function FonctionnalitesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line/60 bg-gradient-to-b from-paper via-primary-light/30 to-paper pb-16 pt-14 sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-grid-soft [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Fonctionnalités Clés &amp; Architecture
            </div>
            <h1 className="mb-6 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Tout pour tenir l’institut —{" "}
              <br className="hidden sm:inline" />
              <span className="font-medium italic text-primary">
                dans une seule plateforme.
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base font-normal leading-relaxed text-ink/55 sm:text-xl">
              Rendez-vous, clientes, caisse, stock, fidélité, WhatsApp et rapports.
              Ancres SEO prêtes à partager et rigueur comptable infaillible.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/demo/"
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-7 py-3.5 text-base font-medium text-white shadow-soft transition hover:bg-primary-dark sm:w-auto"
              >
                Demander une démo
              </Link>
              <Link
                href="/essai/"
                className="inline-flex w-full items-center justify-center rounded-full border border-line bg-white px-7 py-3.5 text-base font-medium text-ink shadow-sm transition hover:border-primary/40 hover:bg-primary-light/50 sm:w-auto"
              >
                Demande d’essai 14 jours
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-ink/55">
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-primary">✓</span> Conforme dirham marocain (MAD)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-primary">✓</span> Zéro double réservation garantie
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-primary">✓</span> WhatsApp envoi humain
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Sticky pill nav */}
      <aside className="sticky top-[5.5rem] z-40 border-b border-line bg-white/95 py-3 shadow-sm backdrop-blur-md md:top-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav
            aria-label="Sommaire des modules"
            className="no-scrollbar flex items-center space-x-2 overflow-x-auto py-1 text-xs font-medium"
          >
            <span className="mr-2 hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-ink/40 lg:inline">
              Accès direct :
            </span>
            {PILLS.map((p, i) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 transition-all ${
                  i === 0
                    ? "bg-primary-light font-semibold text-primary hover:bg-primary hover:text-white"
                    : "border border-line bg-paper text-ink/55 hover:bg-primary-light/50 hover:text-primary"
                }`}
              >
                {p.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <main className="mx-auto max-w-7xl space-y-24 px-4 py-16 sm:px-6 lg:px-8">
        {/* 01 Rendez-vous */}
        <Reveal>
          <section className="scroll-mt-36" id="rdv">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-6">
                <FeatureBadge n="01" label="Planning & Réservations" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Rendez-vous
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Le planning tient la journée — sans double-réservation.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">Vue jour / semaine</strong> par employée et
                    par cabine disponible d&apos;un seul coup d&apos;œil.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Contrainte EXCLUDE PostgreSQL :</strong> le
                    chevauchement d’horaires est physiquement refusé en base de données.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Statuts limpides :</strong> confirmé, en
                    cours, terminé, annulé, no-show.
                  </Point>
                  <Point>
                    Rappel WhatsApp préparé,{" "}
                    <strong className="text-ink/80">envoi à la main</strong> sans blocage de
                    numéro.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-soft">
                  <div className="mb-4 flex items-center justify-between border-b border-line pb-4">
                    <div className="flex items-center space-x-2">
                      <span className="h-3 w-3 rounded-full bg-red-400" />
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="ml-2 text-xs font-semibold text-ink/40">
                        Vue Jour — Cabines 1 &amp; 2
                      </span>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Anti-conflit actif
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary-light/60 p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary">10:00 - 11:15</span>
                          <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-white">
                            En cours
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-ink">
                          Soin Visage Hydrafacial — Sarah M.
                        </p>
                        <p className="text-xs text-ink/55">Cabine 1 · Esthéticienne : Kenza</p>
                      </div>
                      <span className="text-xs font-bold text-ink">450 MAD</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-line bg-paper p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink/55">11:30 - 12:30</span>
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                            Confirmé
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-ink">
                          Manucure Russe + Vernis semi-permanent
                        </p>
                        <p className="text-xs text-ink/55">Cabine Ongles · Esthéticienne : Leila</p>
                      </div>
                      <span className="text-xs font-bold text-ink">280 MAD</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-900 p-2.5 font-mono text-xs text-neutral-300">
                      <span>SQL: [11:15 - 11:30] Interdit de superposition</span>
                      <span className="font-bold text-emerald-400">100% Intègre</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 02 Clientes */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="clientes">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="order-2 space-y-4 lg:order-1 lg:col-span-6">
                <div className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light font-display text-lg font-bold text-primary">
                        YB
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-ink">Yasmina Berrada</h4>
                        <p className="text-xs text-ink/55">+212 6 61 •• •• 89 · Casablanca</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-gold/30 bg-[#FBF5E9] px-2.5 py-1 text-xs font-bold text-gold">
                      VIP · 420 Pts
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {[
                      ["Total Visites", "14 RDV"],
                      ["Total Dépensé", "6 450 MAD"],
                      ["Forfaits", "2 restants"],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-lg border border-line bg-paper p-2.5">
                        <div className="text-[10px] font-semibold uppercase text-ink/40">{l}</div>
                        <div
                          className={`mt-0.5 text-sm font-bold ${
                            l === "Forfaits" ? "text-primary" : "text-ink"
                          }`}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-primary/15 bg-primary-light/40 p-3 text-xs">
                    <span className="mb-0.5 block font-semibold text-ink">
                      Notes internes cabine :
                    </span>
                    <p className="italic text-ink/55">
                      « Peau très réactive aux acides. Préférer le sérum apaisant à la rose. Thé
                      vert sans sucre à l&apos;arrivée. »
                    </p>
                  </div>
                </div>
              </div>
              <div className="order-1 space-y-6 lg:order-2 lg:col-span-6">
                <FeatureBadge n="02" label="Fichier & Connaissance" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Clientes
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  La mémoire de l’institut, sans photos en V1.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">Fiche centralisée :</strong> coordonnées
                    précises, historique complet des RDV et notes internes confidentielles.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Aucune photo cliente stockée en V1 :</strong>{" "}
                    respect total de la vie privée et conformité éthique stricte.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Fidélité et forfaits sur la même fiche :</strong>{" "}
                    suivi instantané des séances restantes sans carnet papier.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Recherche ultra-rapide</strong> au secrétariat
                    par nom, prénom ou 4 derniers chiffres du téléphone.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 03 Caisse */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="caisse">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-6">
                <FeatureBadge n="03" label="Rigueur Financière" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Caisse &amp; paiements
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Chaque dirham a une trace. Rien n’est réécrit.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">Montants en Decimal — jamais de Float :</strong>{" "}
                    précision monétaire absolue au centime près.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Paiement = historique immuable :</strong> les
                    erreurs sont corrigées via remboursement documenté, jamais par suppression.
                  </Point>
                  <Point>
                    Tickets / reçus clairs et{" "}
                    <strong className="text-ink/80">clôture de caisse Z</strong> journalière
                    irréversible.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Numérotation des factures côté serveur</strong>
                    , pas au navigateur : antifraude garanti.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="space-y-3 rounded-2xl border border-line bg-white p-6 font-mono text-xs text-ink shadow-soft">
                  <div className="border-b border-dashed border-line pb-3 text-center">
                    <span className="font-sans text-sm font-bold tracking-wider">
                      INSTITUT ÉLÉGANCE MAROC
                    </span>
                    <p className="font-sans text-[11px] text-ink/55">
                      Ticket N° 2024-00892 · Serveur vérifié
                    </p>
                  </div>
                  <div className="space-y-1.5 py-1">
                    <div className="flex justify-between">
                      <span>1x Épilation Jambes Complètes</span>
                      <span>220.00 MAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Sérum Éclat Niacinamide 30ml</span>
                      <span>380.00 MAD</span>
                    </div>
                    <div className="flex justify-between font-semibold text-primary">
                      <span>Remise Fidélité (-10%)</span>
                      <span>-60.00 MAD</span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-line pt-2 font-sans text-sm font-bold">
                    <span>TOTAL ENCAISSÉ</span>
                    <span className="font-mono text-primary">540.00 MAD</span>
                  </div>
                  <div className="space-y-0.5 rounded bg-paper p-2 text-[10px] text-ink/55">
                    <div>Mode : Espèces (300.00 MAD) + TPE Carte (240.00 MAD)</div>
                    <div>Horodatage inviolable : 14:28:12 UTC+1</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 04 Stock */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="stock">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-6">
                <div className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">
                      Mouvements Récents (Ledger)
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Cache recalculable OK
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-ink/40">
                        <th className="pb-1.5 font-medium">Produit</th>
                        <th className="pb-1.5 font-medium">Action</th>
                        <th className="pb-1.5 text-right font-medium">Mouvement</th>
                        <th className="pb-1.5 text-right font-medium">Reste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      <tr>
                        <td className="py-2 font-medium">Cire Tiède 800g</td>
                        <td className="py-2 text-ink/55">Usage Cabine 2</td>
                        <td className="py-2 text-right font-semibold text-red-600">-1 pot</td>
                        <td className="py-2 text-right font-bold text-amber-600">3 pots ⚠️</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Huile Argan Bio 1L</td>
                        <td className="py-2 text-ink/55">Achat Fournisseur</td>
                        <td className="py-2 text-right font-semibold text-emerald-600">
                          +5 flacons
                        </td>
                        <td className="py-2 text-right font-bold">12 flacons</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Crème Hydratante 50ml</td>
                        <td className="py-2 text-ink/55">Vente comptoir</td>
                        <td className="py-2 text-right font-semibold text-red-600">-1 unité</td>
                        <td className="py-2 text-right font-bold">8 unités</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between rounded-lg border border-line bg-paper p-2.5 text-[11px] text-ink/55">
                    <span>Alerte stock bas : notification automatique déclenchée</span>
                    <span className="font-bold text-primary">Commander</span>
                  </div>
                </div>
              </div>
              <div className="order-1 space-y-6 lg:order-2 lg:col-span-6">
                <FeatureBadge n="04" label="Gestion des Produits" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Stock
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Un ledger, pas un chiffre qu’on écrase.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">Mouvements append-only :</strong> traçabilité
                    exhaustive (achat, vente, usage en cabine, perte ou casse).
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Le stock affiché est un cache recalculable :</strong>{" "}
                    aucune divergence possible avec les inventaires physiques.
                  </Point>
                  <Point>
                    Fournisseurs répertoriés, historique des commandes et{" "}
                    <strong className="text-ink/80">alertes de rupture intelligentes</strong>.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Déstockage automatique :</strong> consommation
                    liée directement à la prestation cabine terminée.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 05 Fidélité */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="fidelite">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-6">
                <FeatureBadge n="05" label="Rétention & Cadeaux" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Fidélité
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Faire revenir sans spammer.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">
                      Points, forfaits prépayés et cartes cadeaux numériques :
                    </strong>{" "}
                    tout est centralisé sous un compte client unique.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Règles transparentes par abonnement :</strong>{" "}
                    formules adaptées au plan Institut ou Premium selon vos objectifs.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Historique détaillé des mouvements de points :</strong>{" "}
                    chaque point gagné ou consommé est tracé sans litige.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-neutral-900 p-6 text-white shadow-xl">
                  <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-white/60">
                        Carte Cadeau Privilège
                      </span>
                      <h4 className="mt-1 font-display text-xl font-bold text-white">
                        Soin Rituel Hammam &amp; Massage
                      </h4>
                    </div>
                    <span className="rounded-full border border-gold/40 bg-gold/20 px-2.5 py-1 text-xs font-bold text-gold">
                      Valide
                    </span>
                  </div>
                  <div className="relative mt-8 flex items-end justify-between border-t border-white/10 pt-4">
                    <div>
                      <div className="text-[11px] text-white/50">Solde disponible</div>
                      <div className="font-mono text-2xl font-bold text-white">600.00 MAD</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-white/50">Expire le</div>
                      <div className="font-mono text-xs text-white/80">31/12/2025</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 06 Promotions */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="promotions">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-6">
                <div className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-soft">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="text-sm font-bold text-ink">Code Promo Actif</span>
                    <span className="rounded bg-primary-light px-2.5 py-1 font-mono text-xs font-bold text-primary">
                      RAMADAN25
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-ink/55">
                    <div className="flex justify-between">
                      <span>Type :</span>
                      <span className="font-semibold text-ink">Remise fixe de 150 MAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Condition :</span>
                      <span className="font-semibold text-ink">Panier &gt; 500 MAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limitation :</span>
                      <span className="font-semibold text-ink">
                        1 fois par cliente · Max 50 utilisations
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                    <span>Traçabilité ticket garantie</span>
                    <span className="font-bold">Zéro abus caisse</span>
                  </div>
                </div>
              </div>
              <div className="order-1 space-y-6 lg:order-2 lg:col-span-6">
                <FeatureBadge n="06" label="Offres Maîtrisées" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Promotions
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Offres contrôlées, pas de bricolage en caisse.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">
                      Codes promo et remises hautement paramétrables
                    </strong>{" "}
                    (pourcentage, montant fixe, plafonds).
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Campagnes préparées pour WhatsApp manuel :</strong>{" "}
                    texte rédigé et prêt à l&apos;envoi personnalisé.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Traçabilité totale sur le ticket de caisse :</strong>{" "}
                    analyse nette de l&apos;impact des promos sur la marge.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 07 WhatsApp */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="whatsapp">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-6">
                <FeatureBadge n="07" label="Communication Humaine" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  WhatsApp
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Préparez. Envoyez. Marquez. Aucun bot en V1.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">Tous les scénarios pré-remplis :</strong>{" "}
                    rappels de RDV 24h avant, confirmations, demande d&apos;avis et réactivation.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Flux wa.me sécurisé :</strong> Message préparé
                    → ouverture wa.me → envoi humain depuis le téléphone de l’institut.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Respect strict de l’opt-in marketing</strong> et
                    protection contre les bannissements Meta / WhatsApp.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Aucun coût d’API ni surtaxe :</strong> aucun
                    envoi automatique WhatsApp Business API en V1.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="mx-auto max-w-md rounded-2xl border border-line bg-[#EFEAE2] p-5 shadow-soft">
                  <div className="-m-5 mb-4 flex items-center justify-between rounded-t-2xl bg-[#075E54] p-3 text-white">
                    <div className="flex items-center space-x-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                        RB
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">
                          Rappel Beauté · Institut
                        </div>
                        <div className="text-[10px] text-emerald-200">Prêt à l&apos;envoi humain</div>
                      </div>
                    </div>
                    <span className="rounded bg-[#128C7E] px-2 py-0.5 text-[11px]">wa.me</span>
                  </div>
                  <div className="space-y-1.5 rounded-lg rounded-tl-none bg-white p-3 text-xs text-ink shadow-sm">
                    <p>Bonjour Kenza ✨</p>
                    <p>
                      Nous vous confirmons votre rendez-vous pour votre{" "}
                      <strong>Soin Visage Hydrafacial</strong> demain à <strong>10:00</strong> avec
                      Sarah chez Maison de Beauté.
                    </p>
                    <p className="text-[11px] text-ink/55">
                      En cas d&apos;empêchement, merci de nous prévenir 24h à l&apos;avance. À demain
                      ! 🌸
                    </p>
                    <div className="text-right text-[10px] text-ink/40">
                      10:14 · Préparé par le système
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                      Envoyer d&apos;un clic sur WhatsApp ↗
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 08 Avis */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="avis">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-6">
                <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="text-lg text-amber-400">★★★★★</div>
                    <span className="text-xs font-bold text-ink/55">Fiche Google My Business</span>
                  </div>
                  <p className="rounded-xl border border-line bg-paper p-3 text-xs italic text-ink">
                    « Très belle expérience pour mon massage relaxant ! Accueil aux petits soins,
                    hygiène impeccable et personnel chaleureux. Je reviendrai sans hésiter. »
                  </p>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-medium text-ink">Meryem Bennani</span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">
                      Avis 5/5 vérifié post-soin
                    </span>
                  </div>
                </div>
              </div>
              <div className="order-1 space-y-6 lg:order-2 lg:col-span-6">
                <FeatureBadge n="08" label="Réputation & Google" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Avis
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Demander l’avis après le soin — toujours à la main.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">Demande d&apos;avis post-RDV préparée :</strong>{" "}
                    texte courtois avec votre lien direct d&apos;évaluation.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Suivi centralisé des retours clientes :</strong>{" "}
                    identification immédiate des insatisfactions pour réagir vite.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">
                      Lien Google / Fiche institut personnalisable :
                    </strong>{" "}
                    booster le classement local SEO de votre salon.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 09 Analytics */}
        <Reveal>
          <section className="scroll-mt-36 border-t border-line/60 pt-6" id="analytics">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-6">
                <FeatureBadge n="09" label="Pilotage & Croissance" />
                <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Analytics &amp; rapports
                </h2>
                <p className="font-display text-xl italic text-ink/80">
                  Le CA du jour, le remplissage, les services qui portent.
                </p>
                <ul className="space-y-3.5 text-sm text-ink/55 sm:text-base">
                  <Point>
                    <strong className="text-ink/80">Tableau de bord du matin pour la patronne :</strong>{" "}
                    vision claire sur le CA prévu, les créneaux libres et l&apos;équipe.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Rapports exportables (Excel / PDF) :</strong> rôle{" "}
                    <code className="rounded bg-paper px-1 text-xs">ACCOUNTANT</code> inclus pour
                    un partage fluide avec votre comptable.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">
                      Multi-sites consolidé sur plan Premium (899 MAD) :
                    </strong>{" "}
                    supervision de plusieurs instituts sur un même écran.
                  </Point>
                  <Point>
                    <strong className="text-ink/80">Les chiffres suivent la caisse :</strong> finis
                    les écarts entre le tableur parallèle et la réalité de la caisse.
                  </Point>
                </ul>
                <div className="pt-2">
                  <DemoLink />
                </div>
              </div>
              <div className="lg:col-span-6">
                <div className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-soft">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div>
                      <span className="block text-xs text-ink/55">Chiffre d&apos;Affaires du Mois</span>
                      <span className="font-display text-2xl font-bold text-ink">84 250 MAD</span>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      +18.4% vs M-1
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-ink/55">
                      <span>Taux de remplissage cabines</span>
                      <span className="font-bold text-ink">82%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full border border-line bg-paper">
                      <div className="h-3 rounded-full bg-primary" style={{ width: "82%" }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="rounded-xl border border-line bg-paper p-3">
                      <span className="text-[10px] font-semibold uppercase text-ink/40">
                        Service Top 1
                      </span>
                      <p className="mt-0.5 font-bold text-ink">Hydrafacial Deluxe</p>
                      <p className="text-[11px] text-ink/55">32 000 MAD ce mois</p>
                    </div>
                    <div className="rounded-xl border border-line bg-paper p-3">
                      <span className="text-[10px] font-semibold uppercase text-ink/40">
                        Export Comptable
                      </span>
                      <p className="mt-0.5 font-bold text-primary">Rapport Z &amp; TVA</p>
                      <p className="text-[11px] text-ink/55">Format CSV / PDF</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      {/* CTA */}
      <section className="mx-auto my-16 max-w-7xl px-4 sm:px-6 lg:px-8" id="demande-demo">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-white shadow-2xl sm:p-14">
            <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 mx-auto max-w-3xl space-y-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-light">
                Déploiement Simplifié
              </div>
              <h3 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
                Reprenez la main sur votre institut dès aujourd’hui.
              </h3>
              <p className="mx-auto max-w-xl text-base font-normal text-white/80 sm:text-lg">
                Une démo de 20 minutes, ou une demande d’essai. Activation sous 24 h, sans carte
                bancaire requise.
              </p>
              <div
                className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row"
                id="demande-essai"
              >
                <Link
                  href="/demo/"
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-4 text-base font-semibold text-white shadow-soft transition hover:scale-105 hover:bg-primary-dark sm:w-auto"
                >
                  Demander une démo
                </Link>
                <Link
                  href="/essai/"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/20 sm:w-auto"
                >
                  Demande d’essai 14 jours
                </Link>
              </div>
              <p className="pt-2 text-xs text-white/50">
                Starter 299 MAD · Institut 499 MAD · Premium 899 MAD · Sans engagement
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
