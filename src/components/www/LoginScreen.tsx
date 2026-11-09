import { CalendarDays, Layers, Monitor, Users } from "lucide-react";
import { SitePhone } from "@/components/www/SitePhone";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";

const features = [
  { icon: CalendarDays, title: "Gestion du planning", text: "simple et rapide" },
  { icon: Users, title: "Suivi des clientes", text: "et fidélité" },
  { icon: Layers, title: "Stock, produits", text: "et caisse" },
  { icon: Monitor, title: "Réservation en ligne", text: "24h/24" },
];

export function SiteFeatureBar({ showPrices = false }: { showPrices?: boolean }) {
  const phone = (
    <SitePhone
      className="text-sm font-semibold text-ink"
      iconClassName="h-5 w-5 shrink-0 text-primary"
    />
  );

  return (
    <div className="border-t border-primary/10 px-6 py-5 sm:px-10">
      {showPrices ? (
        <div className="mx-auto mb-5 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-[#eadfe3] bg-white px-8 py-4 shadow-[0_16px_40px_-28px_rgba(40,20,30,0.45)]">
          {phone}
          <span aria-hidden className="hidden h-5 w-px bg-[#eadfe3] sm:block" />
          <p className="whitespace-nowrap text-sm text-ink/65">
            <span className="font-semibold text-ink">{PUBLIC_OFFER.monthlyPrice} DH</span> / mois
          </p>
          <span aria-hidden className="hidden h-5 w-px bg-[#eadfe3] sm:block" />
          <p className="whitespace-nowrap text-sm text-ink/65">
            <span className="font-semibold text-ink">{formatPrice(PUBLIC_OFFER.annualPrice)} DH</span> / an
          </p>
        </div>
      ) : null}
      {showPrices ? null : <div className="mb-4 flex justify-center">{phone}</div>}
      <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-x-12 gap-y-3">
        {features.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center justify-center gap-2.5 whitespace-nowrap">
            <Icon aria-hidden className="shrink-0 text-primary" size={20} strokeWidth={1.6} />
            <p className="text-sm text-ink/65">
              <span className="font-semibold text-ink">{title}</span> {text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoginScreen({ children }: { children: React.ReactNode }) {
  return (
    <section className="container-rb grid gap-12 py-12 md:py-20 lg:grid-cols-2 lg:gap-16">
      <div className="flex justify-center lg:justify-start">{children}</div>
      <div className="lg:border-l lg:border-ink/15 lg:pl-16">
        <p className="font-display text-3xl font-light leading-tight tracking-tight text-ink">
          Votre journée vous attend.
        </p>
        <ul className="mt-6 border-t border-ink/15">
          {features.map(({ title, text }) => (
            <li key={title} className="border-b border-ink/15 py-3 text-ink/70">
              <span className="font-semibold text-ink">{title}</span> {text}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <SitePhone
            className="text-sm font-semibold text-ink"
            iconClassName="h-5 w-5 shrink-0 text-primary"
          />
        </div>
      </div>
    </section>
  );
}
