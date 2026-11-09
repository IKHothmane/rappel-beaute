import { CalendarDays, Globe, Headphones, Package, ShieldCheck, Star, Users } from "lucide-react";
import { ProfessionnelForm } from "@/components/www/ProfessionnelForm";

const HERO = "/site/rappelbeauty-background-salon.webp";

const FEATURES = [
  {
    title: "Rendez-vous & planning",
    text: "Agenda, disponibilités, notifications.",
    icon: CalendarDays,
  },
  {
    title: "Clientes & fidélité",
    text: "Fiches clientes, forfaits, cartes de fidélité.",
    icon: Users,
  },
  {
    title: "Stock & caisse",
    text: "Produits, encaissements et suivi du stock.",
    icon: Package,
  },
  {
    title: "Réservation en ligne",
    text: "Vos clientes réservent 24h/24, en toute simplicité.",
    icon: Globe,
  },
] as const;

const STATS = [
  { icon: Users, value: "+ 500", label: "Instituts accompagnés" },
  { icon: Star, value: "98 %", label: "Satisfaction clients" },
  { icon: Headphones, value: "Support local", label: "Réactif et à votre écoute" },
  { icon: ShieldCheck, value: "Données sécurisées", label: "Hébergées au Maroc" },
] as const;

const DEFAULT_HEADING = "Le logiciel tout-en-un pour les instituts de beauté au Maroc.";

export function ProfessionnelSignup({
  heading = DEFAULT_HEADING,
}: {
  heading?: string;
}) {
  return (
    <section className="bg-[#fbf7f4]">
      <div className="grid lg:grid-cols-[minmax(280px,0.86fr)_minmax(0,1.2fr)]">
        <div className="relative min-h-80 lg:min-h-[calc(100dvh-11rem)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Accueil d'un institut Rappel Beauty"
            className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            src={HERO}
          />
        </div>

        <div className="px-5 py-10 sm:px-8 lg:px-10 lg:py-12 xl:px-14">
          <h1 className="max-w-xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            {heading === DEFAULT_HEADING ? (
              <>
                Le logiciel tout-en-un
                <br />
                pour les <span className="text-primary">instituts de beauté</span>
                <br />
                au Maroc.
              </>
            ) : (
              heading
            )}
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/60">
            Rendez-vous, clientes, stock, caisse, fidélité et réservation en ligne.
          </p>

          <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_15.5rem]">
            <div id="inscription" className="rounded-2xl border border-[#f0e4e8] bg-white p-5 shadow-[0_18px_50px_-28px_rgba(36,26,34,0.45)] sm:p-6">
              <ProfessionnelForm />
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex gap-3 rounded-2xl bg-white/70 p-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <feature.icon aria-hidden className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{feature.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">{feature.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-[#f0e4e8] bg-[#f7f1ee]">
        <ul className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:py-7">
          {STATS.map((stat) => (
            <li key={stat.label} className="flex items-center gap-3 lg:justify-center">
              <stat.icon aria-hidden className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.7} />
              <span>
                <span className="block text-sm font-semibold text-ink">{stat.value}</span>
                <span className="block text-xs text-ink/55">{stat.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
