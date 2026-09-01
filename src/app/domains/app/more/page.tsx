import type { Metadata } from "next";
import Link from "next/link";
import { AppPageHeader } from "@/components/app/AppUi";

export const metadata: Metadata = { title: "Menu" };

const GROUPS = [
  {
    title: "Gestion",
    links: [
      { href: "/services/", label: "Services" },
      { href: "/staff/", label: "Employées" },
      { href: "/resources/", label: "Ressources" },
    ],
  },
  {
    title: "Stock & finance",
    links: [
      { href: "/inventory/", label: "Stock" },
      { href: "/suppliers/", label: "Fournisseurs" },
      { href: "/purchases/", label: "Achats" },
      { href: "/payments/", label: "Paiements" },
      { href: "/expenses/", label: "Dépenses" },
      { href: "/invoices/", label: "Factures" },
    ],
  },
  {
    title: "Croissance",
    links: [
      { href: "/whatsapp/", label: "WhatsApp" },
      { href: "/loyalty/", label: "Fidélité" },
      { href: "/marketing/", label: "Marketing" },
      { href: "/promotions/", label: "Promotions" },
      { href: "/gift-cards/", label: "Cartes cadeaux" },
      { href: "/reviews/", label: "Avis" },
    ],
  },
  {
    title: "Pilotage",
    links: [
      { href: "/analytics/", label: "Analytics" },
      { href: "/reports/", label: "Rapports" },
      { href: "/notifications/", label: "Notifications" },
      { href: "/settings/", label: "Paramètres" },
      { href: "/settings/users/", label: "Utilisateurs" },
      { href: "/onboarding/", label: "Onboarding" },
      { href: "/profile/", label: "Mon profil" },
      { href: "/security/", label: "Sécurité" },
      { href: "/book/institut-royal/", label: "Réservation publique" },
    ],
  },
];

export default function MorePage() {
  return (
    <>
      <AppPageHeader
        title="Menu"
        description="Tous les modules — raccourcis mobile & tablette."
      />
      <div className="space-y-4">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <p className="mb-2 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/40">
              {g.title}
            </p>
            <ul className="surface divide-y divide-line text-sm">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block px-4 py-3.5 hover:bg-[#FBF4F6] sm:px-5"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
