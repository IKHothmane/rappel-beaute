import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUi";

export const metadata: Metadata = { title: "Accès refusé" };

export default function ForbiddenPage() {
  return (
    <>
      <AdminPageHeader
        title="Accès refusé"
        description="403 — compte d’administration requis."
      />
      <div className="ac-card p-8 text-sm text-[var(--admin-muted)]">
        Un compte institut ne peut pas ouvrir cette console.
        <div className="mt-6">
          <Link href="/dashboard/" className="ac-btn inline-flex">
            Tableau de bord
          </Link>
        </div>
      </div>
    </>
  );
}
