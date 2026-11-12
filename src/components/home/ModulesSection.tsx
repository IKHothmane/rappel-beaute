import Link from "next/link";
import "./modules-section.css";
import {
  UsersRound,
  Tag,
  Armchair,
  Truck,
  ReceiptText,
  Gift,
  ChartNoAxesColumnIncreasing,
  Sparkles,
  ArrowUpRight,
  Check,
} from "lucide-react";

const modules = [
  {
    title: "Équipe & planning",
    description: "Horaires, congés, soins autorisés et commissions calculées automatiquement.",
    icon: UsersRound,
    href: "/fonctionnalites/",
  },
  {
    title: "Services",
    description: "Durée, prix, cabine et machine nécessaires pour chaque prestation.",
    icon: Tag,
    href: "/fonctionnalites/",
  },
  {
    title: "Ressources",
    description: "Cabines, salles, fauteuils et machines, avec maintenance prévue.",
    icon: Armchair,
    href: "/fonctionnalites/",
  },
  {
    title: "Fournisseurs & achats",
    description: "Bons de commande et réceptions qui mettent le stock à jour.",
    icon: Truck,
    href: "/fonctionnalites/",
  },
  {
    title: "Dépenses",
    description: "Loyer, produits, salaires : votre bénéfice net, pas seulement le CA.",
    icon: ReceiptText,
    href: "/fonctionnalites/",
  },
  {
    title: "Promotions & avis",
    description: "Codes promo, campagnes ciblées et avis clientes au même endroit.",
    icon: Gift,
    href: "/fonctionnalites/",
  },
  {
    title: "Analytics",
    description: "Santé de l'établissement, panier moyen, affluence horaire et rétention.",
    icon: ChartNoAxesColumnIncreasing,
    href: "/fonctionnalites/",
  },
  {
    title: "Assistant IA",
    description:
      "Posez vos questions en français : quelles clientes ne sont pas revenues depuis 3 mois ?",
    icon: Sparkles,
    href: "/fonctionnalites/",
  },
];

export default function ModulesSection() {
  return (
    <section
      id="modules"
      aria-labelledby="modules-heading"
      className="modules-section relative isolate overflow-hidden bg-vt-surface py-[var(--vt-space-3p5rem)] lg:py-[var(--vt-space-4rem)]"
    >
      {/* Arrière-plan décoratif */}

      <div className="relative mx-auto max-w-[var(--vt-size-1200px)] px-[var(--vt-space-1p5rem)] lg:px-[var(--vt-space-2rem)]">
        {/* En-tête */}
        <div className="mx-auto mb-[var(--vt-space-3p5rem)] max-w-[var(--vt-size-48rem)] text-center">
          <div className="mb-[var(--vt-space-1p5rem)] flex items-center justify-center gap-[var(--vt-space-1rem)]">
            <span className="h-[var(--vt-size-1px)] w-[var(--vt-size-2p25rem)] bg-vt-primary-bright" />
            <span className="text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-bold uppercase tracking-[0.17em] text-vt-primary-rich">
              Inclus dans l’abonnement
            </span>
            <span className="h-[var(--vt-size-1px)] w-[var(--vt-size-2p25rem)] bg-vt-primary-bright" />
          </div>

          <h2
            id="modules-heading"
            className="font-serif font-semibold leading-[1.13] tracking-tight text-vt-ink-plum"
          >
            Les modules dont un institut
            <br className="hidden sm:block" /> a{" "}
            <span className="relative inline-block italic text-vt-primary-rich">
              vraiment besoin
              <svg
                aria-hidden="true"
                viewBox="0 0 300 15"
                className="absolute -bottom-2 left-[var(--vt-size-0rem)] w-full"
                fill="none"
              >
                <path
                  d="M3 11C70 1 210 1 297 10"
                  stroke="#c00053"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>

          <p className="mt-[var(--vt-space-2rem)] text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] leading-8 text-vt-muted sm:text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)]">
            Pas d’option payante à ajouter.
            <br className="sm:hidden" /> Tout est disponible dès le premier jour.
          </p>
        </div>

        {/* Grille des modules */}
        <div className="grid grid-cols-1 gap-[var(--vt-space-1p25rem)] sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.title}
                href={module.href}
                className="module-card group relative flex flex-col overflow-hidden rounded-[var(--vt-size-18px)] border border-[#f0d5df] bg-white/90 p-[var(--vt-space-1p25rem)] shadow-[0_8px_24px_rgba(107,27,61,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-vt-primary-bright hover:shadow-[0_16px_32px_rgba(156,0,68,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vt-primary-rich"
              >
                {/* Reflet subtil */}
                <div
                  aria-hidden="true"
                  className="module-card-glow pointer-events-none absolute inset-[var(--vt-size-0rem)] bg-gradient-to-br from-white via-transparent to-vt-surface-soft opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative z-10 flex flex-1 flex-col">
                  {/* Icône */}
                  <div className="module-card-icon mb-[var(--vt-space-1p75rem)] flex h-[var(--vt-size-4rem)] w-[var(--vt-size-4rem)] items-center justify-center rounded-[var(--vt-size-19px)] bg-gradient-to-br from-vt-surface-soft to-[#fbd4e4] text-vt-primary-rich transition-all duration-300 group-hover:scale-110 group-hover:from-vt-primary-rich group-hover:to-vt-pink group-hover:text-white">
                    <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                  </div>

                  <div className="mb-[var(--vt-space-0p75rem)] flex items-start justify-between gap-[var(--vt-size-0p5rem)]">
                    <h3 className="font-serif text-[length:var(--vt-text-23px)] font-semibold leading-[var(--vt-leading-1p25)] text-vt-ink-plum">
                      {module.title}
                    </h3>

                    <ArrowUpRight
                      size={19}
                      aria-hidden="true"
                      className="shrink-0 text-vt-primary-rich opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100"
                    />
                  </div>

                  <p className="text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-7 text-vt-muted">{module.description}</p>

                  <div className="module-card-foot mt-auto pt-[var(--vt-space-1p5rem)]">
                    <span className="inline-flex items-center gap-[var(--vt-size-0p5rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-semibold text-vt-primary-rich">
                      <Check size={15} aria-hidden="true" />
                      Inclus
                    </span>
                  </div>
                </div>

                {/* Accent inférieur */}
                <div className="absolute bottom-[var(--vt-size-0rem)] left-[var(--vt-size-0rem)] h-[var(--vt-size-3px)] w-[var(--vt-size-0rem)] bg-gradient-to-r from-vt-primary-strong to-[#ef77a5] transition-all duration-500 group-hover:w-full" />
              </Link>
            );
          })}
        </div>

        {/* Pied de section */}
        <div className="mt-[var(--vt-space-3rem)] flex flex-wrap items-center justify-center gap-[var(--vt-space-0p75rem)] text-center text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-vt-muted">
          <span className="flex h-[var(--vt-size-1p75rem)] w-[var(--vt-size-1p75rem)] items-center justify-center rounded-full bg-vt-surface-pink text-vt-primary-rich">
            <Check size={16} aria-hidden="true" />
          </span>
          Tous les modules sont inclus, sans supplément.
        </div>
      </div>
    </section>
  );
}
