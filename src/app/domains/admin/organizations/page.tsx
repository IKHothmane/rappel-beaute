"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, PlanBadge, StatusBadge } from "@/components/admin/AdminUi";
import { fetchOrganizations } from "@/modules/admin/client";
import type { OrganizationListItem, OrganizationStatus, SubscriptionPlan } from "@/types/platform";

export default function OrganizationsPage() {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan | "ALL">("ALL");
  const [status, setStatus] = useState<OrganizationStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOrganizations({
      search: q || undefined,
      status: status !== "ALL" ? status : undefined,
      plan: plan !== "ALL" ? plan : undefined,
    })
      .then((r) => setItems(r.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, plan, status]);

  const cities = useMemo(
    () => Array.from(new Set(items.map((o) => o.city).filter(Boolean))).sort(),
    [items],
  );
  const [city, setCity] = useState("ALL");

  const rows = useMemo(() => {
    if (city === "ALL") return items;
    return items.filter((o) => o.city === city);
  }, [items, city]);

  return (
    <>
      <AdminPageHeader
        title="Instituts"
        description="Cœur de la plateforme — recherche, filtres et actions."
        action={
          <Link href="/organizations/new/" className="ac-btn">
            + Créer un institut
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 ac-card p-4 md:flex-row md:flex-wrap md:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher…"
          className="ac-input md:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrganizationStatus | "ALL")}
          className="ac-input md:w-auto"
        >
          <option value="ALL">Statut</option>
          <option value="ACTIVE">Actif</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as SubscriptionPlan | "ALL")}
          className="ac-input md:w-auto"
        >
          <option value="ALL">Formule</option>
          <option value="STARTER">Starter</option>
          <option value="INSTITUT">Institut</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="ac-input md:w-auto">
          <option value="ALL">Ville</option>
          {cities.map((c) => (
            <option key={c} value={c!}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}

      <div className="hidden overflow-x-auto ac-card md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Institut</th>
              <th className="px-4 py-3 font-medium">Propriétaire</th>
              <th className="px-4 py-3 font-medium">Ville</th>
              <th className="px-4 py-3 font-medium">Formule</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">MRR</th>
              <th className="px-4 py-3 font-medium">Créé</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-line)]">
            {rows.map((org) => (
              <tr key={org.id} className="hover:bg-[#FBF4F6]/50">
                <td className="px-4 py-3 font-medium">{org.name}</td>
                <td className="px-4 py-3 text-[var(--admin-muted)]">{org.ownerName ?? "—"}</td>
                <td className="px-4 py-3">{org.city ?? "—"}</td>
                <td className="px-4 py-3">{org.plan ? <PlanBadge plan={org.plan} /> : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={org.status} /></td>
                <td className="px-4 py-3 font-mono tabular-nums">{org.mrr} MAD</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                  {org.createdAt.slice(0, 10).split("-").reverse().join("/")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/organizations/${org.id}/`} className="font-semibold text-[var(--admin-accent)]">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
