import { Headphones, ShieldCheck, Star, Users } from "lucide-react";
import { ProfessionnelForm } from "@/components/www/ProfessionnelForm";

const FEATURES = [
  {
    title: "Rendez-vous & planning",
    text: "Agenda, disponibilités, notifications.",
  },
  {
    title: "Clientes & fidélité",
    text: "Fiches clientes, forfaits, cartes de fidélité.",
  },
  {
    title: "Stock & caisse",
    text: "Produits, encaissements et suivi du stock.",
  },
  {
    title: "Réservation en ligne",
    text: "Vos clientes réservent 24h/24, en toute simplicité.",
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
    <section className="bg-paper">
      <div className="container-rb grid gap-10 py-12 md:py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <h1 className="font-display text-4xl font-light leading-[1.08] tracking-tight text-ink sm:text-5xl">
            {heading}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/75">
            Rendez-vous, clientes, stock, caisse, fidélité et réservation en ligne.
          </p>
          <ul className="mt-8 border-t border-ink/15">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="border-b border-ink/15 py-3">
                <span className="block font-semibold text-ink">{feature.title}</span>
                <span className="block text-sm text-ink/70">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div id="inscription" className="border border-ink/15 bg-white p-5 sm:p-8">
          <ProfessionnelForm />
        </div>
      </div>

      <div className="border-t border-ink/15 bg-paper">
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
