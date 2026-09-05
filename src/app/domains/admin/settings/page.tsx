"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, StatTile } from "@/components/admin/AdminUi";
import { fetchAdminDashboard } from "@/modules/admin/client";
import type { PlatformDashboardStats } from "@/types/platform";

export default function SettingsPage() {
  const [stats, setStats] = useState<PlatformDashboardStats | null>(null);

  useEffect(() => {
    fetchAdminDashboard()
      .then((d) => setStats(d.stats))
      .catch(() => setStats(null));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Paramètres plateforme"
        description="Vue lecture seule — configuration live issue de PostgreSQL."
      />

      {stats ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatTile label="Instituts" value={String(stats.orgs)} />
          <StatTile label="Utilisateurs" value={String(stats.users)} />
          <StatTile
            label="MRR"
            value={`${stats.mrr.toLocaleString("fr-MA")} MAD`}
          />
        </div>
      ) : (
        <p className="mb-6 text-sm text-[var(--admin-muted)]">Chargement des indicateurs…</p>
      )}

      <section className="ac-card max-w-xl space-y-3 p-6 text-sm">
        <h2 className="font-display text-lg font-semibold">Notes</h2>
        <p className="text-[var(--admin-muted)]">
          Les réglages globaux éditables (maintenance, e-mail transactionnel plateforme)
          seront branchés ici après le restore / staging. Aucune valeur de démonstration
          n&apos;est affichée.
        </p>
      </section>
    </>
  );
}
