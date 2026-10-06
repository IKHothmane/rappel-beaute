import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/www/ContactForm";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Rappel Beauty pour une question sur le logiciel de gestion des instituts de beauté au Maroc.",
  alternates: { canonical: "/contact/" },
};


export default function ContactPage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
            Contact
          </p>
          <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
            Contactez Rappel Beauty
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/70 sm:text-lg">
            Une question sur le logiciel, l&apos;essai ou la formule. Écrivez-nous ou appelez le
            numéro ci-dessous.
          </p>
        </div>
      </section>
      <div className="container-rb grid gap-10 py-16 md:grid-cols-[1fr_1.2fr]">
        <aside className="space-y-6 text-sm">
          <p>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/40">
              E-mail
            </span>
            <a href={`mailto:${SITE.email}`} className="mt-1 inline-block text-primary">
              {SITE.email}
            </a>
          </p>
          <p>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/40">
              Téléphone
            </span>
            <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="mt-1 inline-block text-primary">
              {SITE.phone}
            </a>
          </p>
          <div className="flex flex-col items-start gap-3 pt-2">
            <Link href="/professionnel/" className="text-sm font-semibold text-primary hover:text-primary-dark">
              Essayer gratuitement 7 jours
            </Link>
            <Link
              href="/solutions/institut-beaute/"
              className="text-sm font-semibold text-primary hover:text-primary-dark"
            >
              Découvrir Rappel Beauty
            </Link>
          </div>
        </aside>
        <ContactForm />
      </div>
    </>
  );
}
