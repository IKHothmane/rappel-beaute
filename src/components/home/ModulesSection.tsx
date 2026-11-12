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
      className="modules-section relative isolate overflow-hidden bg-vt-surface py-14 lg:py-16"
    >
      {/* Arrière-plan décoratif */}

      <div className="relative mx-auto max-w-[1200px] px-6 lg:px-8">
        {/* En-tête */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-6 flex items-center justify-center gap-4">
            <span className="h-px w-9 bg-vt-primary-bright" />
            <span className="text-xs font-bold uppercase tracking-[0.17em] text-vt-primary-rich">
              Inclus dans l’abonnement
            </span>
            <span className="h-px w-9 bg-vt-primary-bright" />
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
                className="absolute -bottom-2 left-0 w-full"
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

          <p className="mt-8 text-base leading-8 text-vt-muted sm:text-lg">
            Pas d’option payante à ajouter.
            <br className="sm:hidden" /> Tout est disponible dès le premier jour.
          </p>
        </div>

        {/* Grille des modules */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.title}
                href={module.href}
                className="module-card group relative flex flex-col overflow-hidden rounded-[18px] border border-[#f0d5df] bg-white/90 p-5 shadow-[0_8px_24px_rgba(107,27,61,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-vt-primary-bright hover:shadow-[0_16px_32px_rgba(156,0,68,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vt-primary-rich"
              >
                {/* Reflet subtil */}
                <div
                  aria-hidden="true"
                  className="module-card-glow pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-transparent to-vt-surface-soft opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                <div className="relative z-10 flex flex-1 flex-col">
                  {/* Icône */}
                  <div className="module-card-icon mb-7 flex h-16 w-16 items-center justify-center rounded-[19px] bg-gradient-to-br from-vt-surface-soft to-[#fbd4e4] text-vt-primary-rich transition-all duration-300 group-hover:scale-110 group-hover:from-vt-primary-rich group-hover:to-vt-pink group-hover:text-white">
                    <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                  </div>

                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="font-serif text-[23px] font-semibold leading-tight text-vt-ink-plum">
                      {module.title}
                    </h3>

                    <ArrowUpRight
                      size={19}
                      aria-hidden="true"
                      className="shrink-0 text-vt-primary-rich opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100"
                    />
                  </div>

                  <p className="text-sm leading-7 text-vt-muted">{module.description}</p>

                  <div className="module-card-foot mt-auto pt-6">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-vt-primary-rich">
                      <Check size={15} aria-hidden="true" />
                      Inclus
                    </span>
                  </div>
                </div>

                {/* Accent inférieur */}
                <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-gradient-to-r from-vt-primary-strong to-[#ef77a5] transition-all duration-500 group-hover:w-full" />
              </Link>
            );
          })}
        </div>

        {/* Pied de section */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-center text-sm text-vt-muted">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-vt-surface-pink text-vt-primary-rich">
            <Check size={16} aria-hidden="true" />
          </span>
          Tous les modules sont inclus, sans supplément.
        </div>
      </div>
    </section>
  );
}
