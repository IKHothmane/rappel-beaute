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
    <section className="salon-backdrop">
      <div className="relative flex w-full flex-col justify-center px-5 py-12 sm:px-8 lg:ml-[50%] lg:w-1/2 lg:px-8 lg:py-14 xl:pr-12">
        <div className="flex items-start">{children}</div>
        <ul className="mt-8 flex w-full max-w-[27.5rem] flex-col gap-3 lg:absolute lg:bottom-14 lg:left-[calc(2rem+27.5rem+1.25rem)] lg:top-auto lg:mt-0 lg:w-[16rem] lg:max-w-none">
          <li className="flex items-center rounded-2xl border border-[#eadfe3] bg-white px-4 py-3.5 shadow-[0_16px_40px_-28px_rgba(40,20,30,0.45)]">
            <SitePhone
              className="text-sm font-semibold text-ink"
              iconClassName="h-5 w-5 shrink-0 text-primary"
            />
          </li>
          {features.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex items-center gap-2.5 rounded-2xl border border-[#eadfe3] bg-white px-4 py-3.5 shadow-[0_16px_40px_-28px_rgba(40,20,30,0.45)]"
            >
              <Icon aria-hidden className="shrink-0 text-primary" size={20} strokeWidth={1.6} />
              <p className="text-sm leading-snug text-ink/65">
                <span className="font-semibold text-ink">{title}</span> {text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
