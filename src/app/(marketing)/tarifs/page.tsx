import type { Metadata } from "next";
import Link from "next/link";
import { PricingSection } from "@/components/www/PricingSection";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Starter 299, Institut 499, Premium 899 MAD / mois. Essai 14 jours sans carte bancaire — activation sous 24 h.",
};

const PROOF = [
  { value: "24", label: "instituts connectés" },
  { value: "4,8/5", label: "note Google" },
  { value: "+200", label: "patronnes accompagnées" },
] as const;

export default function TarifsPage() {
  return (
    <>
      <PageHero
        eyebrow="Tarifs"
        title="Trois plans, en MAD, sans surprise."
        text="14 jours pour essayer, sans carte bancaire. Votre accès est activé sous 24 h — pas de création libre en V1."
      />
      <PricingSection headingId="plans" showIntro={false} />
      <section className="border-t border-line bg-[#FBF4F6] py-16 md:py-20">
        <div className="container-rb">
          <div className="grid gap-8 sm:grid-cols-3">
            {PROOF.map((item) => (
              <div key={item.label} className="text-center sm:text-left">
                <p className="font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-ink/60">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 max-w-2xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Reprenez la main sur votre institut.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink/65">
              Avec une démo de 20 minutes ou une demande d’essai, activation sous
              24 h et sans carte bancaire.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo/" className="btn-primary">
                Demander une démo
              </Link>
              <Link href="/essai/" className="btn-ghost">
                Demander l’essai
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
