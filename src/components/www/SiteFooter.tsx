import Link from "next/link";
import { BrandLogo } from "@/components/www/BrandLogo";
import { SITE } from "@/lib/site";

const COLS = [
  {
    title: "Produit",
    links: [
      { href: "/fonctionnalites/", label: "Fonctionnalités" },
      { href: "/tarifs/", label: "Tarifs" },
      { href: "/whatsapp/", label: "WhatsApp manuel" },
      { href: "/essai/", label: "Essai 7 jours" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/instituts/", label: "Instituts inscrits" },
      { href: "/solutions/institut-beaute/", label: "Institut de beauté" },
      { href: "/gestion-rendez-vous/", label: "Rendez-vous" },
      { href: "/gestion-clientes/", label: "Clientes" },
      { href: "/gestion-stock/", label: "Stock" },
      { href: "/caisse/", label: "Caisse" },
      { href: "/reservation-en-ligne/", label: "Réservation en ligne" },
      { href: "/fidelite/", label: "Fidélité" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { href: "/a-propos/", label: "À propos" },
      { href: "/faq/", label: "FAQ" },
      { href: "/demo/", label: "Demander une démo" },
      { href: "/contact/", label: "Contact" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/mentions-legales/", label: "Mentions légales" },
      { href: "/confidentialite/", label: "Confidentialité" },
      { href: "/professionnel/", label: "Je suis un professionnel" },
      { href: "/connexion/", label: "Se connecter" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer
      className="mt-8 border-t border-line bg-[#FFF8FB] bg-[url('/brand/footer.png')] bg-cover bg-center bg-no-repeat"
    >
      <div className="container-rb grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <BrandLogo height={72} />
          <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-ink/65">
            Rappel Beauty est un logiciel de gestion pour les instituts de beauté au
            Maroc.
          </p>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
              {col.title}
            </p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink/70 transition hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line/80">
        <div className="container-rb flex flex-col gap-2 py-5 text-xs text-ink/45 sm:flex-row sm:justify-between">
          <p>© 2026 {SITE.name}. Tous droits réservés.</p>
          <p>Conçu pour les instituts au Maroc · MAD · FR</p>
        </div>
      </div>
    </footer>
  );
}
