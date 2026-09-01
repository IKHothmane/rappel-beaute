"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader, PlanBadge, SubBadge } from "@/components/admin/AdminUi";

type Row = {
  id: string;
  organizationId: string;
  organizationName: string;
  planCode: string;
  planName: string;
  status: string;
  priceSnapshot: number;
  currentPeriodEnd: string;
};

export default function AdminSubscriptionsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    const q = status !== "ALL" ? `?status=${status}` : "";
    fetch(`/api/admin/subscriptions/${q}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(console.error);
  }, [status]);

  return (
    <>
      <AdminPageHeader title="Abonnements" description="Tous les instituts — filtres et actions." />

      <select
        className="ac-input mb-4 w-auto"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="ALL">Tous statuts</option>
        <option value="ACTIVE">Actif</option>
        <option value="TRIAL">Essai</option>
        <option value="PAUSED">Suspendu</option>
        <option value="PAST_DUE">Impayé</option>
        <option value="CANCELLED">Annulé</option>
      </select>

      <div className="ac-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--admin-line)] text-xs uppercase text-[var(--admin-muted)]">
            <tr>
              <th className="px-4 py-3">Institut</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Prix snapshot</th>
              <th className="px-4 py-3">Fin période</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-line)]">
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link href={`/organizations/${r.organizationId}/`} className="font-medium text-[var(--admin-accent)]">
                    {r.organizationName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <PlanBadge plan={r.planCode as "STARTER"} />
                </td>
                <td className="px-4 py-3">
                  <SubBadge status={r.status as "ACTIVE"} />
                </td>
                <td className="px-4 py-3 font-mono">{r.priceSnapshot} MAD</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {new Date(r.currentPeriodEnd).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
