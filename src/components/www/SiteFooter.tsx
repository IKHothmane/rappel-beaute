import Link from "next/link";
import { SITE } from "@/lib/site";

const COLS = [
  {
    title: "Produit",
    links: [
      { href: "/fonctionnalites/", label: "Fonctionnalités" },
      { href: "/tarifs/", label: "Tarifs" },
      { href: "/whatsapp/", label: "WhatsApp manuel" },
      { href: "/essai/", label: "Demande d’essai" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/solutions/institut-beaute/", label: "Institut de beauté" },
      { href: "/gestion-rendez-vous/", label: "Gestion des rendez-vous" },
      { href: "/gestion-stock/", label: "Gestion de stock" },
      { href: "/gestion-clientes/", label: "Gestion des clientes" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { href: "/ressources/", label: "Centre de ressources" },
      { href: "/faq/", label: "FAQ" },
      { href: "/a-propos/", label: "À propos" },
      { href: "/contact/", label: "Contact" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/mentions-legales/", label: "Mentions légales" },
      { href: "/confidentialite/", label: "Confidentialité" },
      { href: "/login/", label: "Connexion" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-line bg-[#FBF4F6]">
      <div className="container-rb grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-display font-semibold text-white">
              R
            </span>
            <span className="font-display text-sm font-semibold">RAPPEL BEAUTÉ</span>
          </Link>
          <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-ink/65">
            Le logiciel des instituts de beauté au Maroc. Agenda, caisse, stock,
            WhatsApp manuel.
          </p>
          <p className="mt-4 font-mono text-[11px] tracking-wider text-ink/45">
            {SITE.version} · www.rappelbeaute.ma
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
          <p>© 2026 Rappel Beauté. Tous droits réservés.</p>
          <p>Conçu pour les instituts au Maroc · MAD · FR</p>
        </div>
      </div>
    </footer>
  );
}
