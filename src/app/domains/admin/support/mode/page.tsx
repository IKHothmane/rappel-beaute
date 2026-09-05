"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader, StatusBadge } from "@/components/admin/AdminUi";
import { fetchOrganizations } from "@/modules/admin/client";
import type { OrganizationListItem } from "@/types/platform";

export default function SupportModePickerPage() {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations()
      .then((res) => setItems(res.items.filter((o) => o.status !== "SUSPENDED")))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Mode assistance"
        description="Choisissez un institut. Toute session est journalisée."
      />
      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && items.length === 0 ? (
        <p className="ac-card p-6 text-sm text-[var(--admin-muted)]">Aucun institut disponible.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((org) => (
            <li key={org.id}>
              <Link
                href={`/organizations/${org.id}/support/`}
                className="ac-card block p-5 hover:bg-[#FBF4F6]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{org.name}</p>
                  <StatusBadge status={org.status} />
                </div>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  {org.city ?? "—"} · {org.ownerName ?? "—"}
                </p>
                <p className="mt-3 text-sm text-[var(--admin-accent)]">
                  Entrer en mode assistance →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
