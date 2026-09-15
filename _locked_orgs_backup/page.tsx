"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, PlanBadge, StatusBadge } from "@/components/admin/AdminUi";
import { fetchOrganizations } from "@/modules/admin/client";
import type { OrganizationListItem, OrganizationStatus, SubscriptionPlan } from "@/types/platform";

function formatCreated(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export default function OrganizationsPage() {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan | "ALL">("ALL");
  const [status, setStatus] = useState<OrganizationStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
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

  useEffect(() => {
    load();
  }, [load]);

  function openOrg(id: string) {
    window.location.href = `/organizations/${id}/?__host=admin`;
  }

  return (
    <>
      <AdminPageHeader
        title="Instituts"
        description="Cœur de la plateforme — recherche, filtres et actions."
        action={
          <Link href="/organizations/new/?__host=admin" className="ac-btn">
            + Créer un institut
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 ac-card p-4 md:flex-row md:flex-wrap md:items-center">
        <label className="sr-only" htmlFor="org-search">
          Recherche
        </label>
        <input
          id="org-search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Nom / e-mail / ville"
          className="ac-input md:min-w-[240px] md:max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrganizationStatus | "ALL")}
          className="ac-input md:w-auto"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as SubscriptionPlan | "ALL")}
          className="ac-input md:w-auto"
        >
          <option value="ALL">Toutes les formules</option>
          <option value="STARTER">Starter</option>
          <option value="INSTITUT">Institut</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">Aucun institut trouvé.</p>
      ) : null}

      {/* Mobile */}
      <ul className="space-y-3 md:hidden">
        {items.map((org) => (
          <li key={org.id}>
            <button
              type="button"
              onClick={() => openOrg(org.id)}
              className="ac-card w-full p-4 text-left transition hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{org.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                    {org.city ?? "—"} · {org.usersCount} utilisateur
                    {org.usersCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/70">
                  Actions
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {org.plan ? <PlanBadge plan={org.plan} /> : null}
                <StatusBadge status={org.status} />
                <span className="font-mono text-[10px] text-[var(--admin-muted)]">
                  {formatCreated(org.createdAt)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop */}
      <div className="hidden overflow-x-auto ac-card md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Institut</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Créé le</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-line)]">
            {items.map((org) => (
              <tr
                key={org.id}
                role="link"
                tabIndex={0}
                className="cursor-pointer hover:bg-[#FBF4F6]/80"
                onClick={() => openOrg(org.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openOrg(org.id);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{org.name}</p>
                  {org.city || org.ownerEmail ? (
                    <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                      {[org.city, org.ownerEmail].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">{org.plan ? <PlanBadge plan={org.plan} /> : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={org.status} />
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">{org.usersCount}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                  {formatCreated(org.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/70">
                    Actions
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
