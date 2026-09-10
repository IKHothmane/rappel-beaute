"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminPageHeader, PlanBadge, StatusBadge } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import {
  archiveOrganizationApi,
  fetchOrganizations,
  reactivateOrganizationApi,
  suspendOrganizationApi,
} from "@/modules/admin/client";
import type { OrganizationListItem, OrganizationStatus, SubscriptionPlan } from "@/types/platform";

function formatCreated(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

function OrgRowActions({
  org,
  onChanged,
}: {
  org: OrganizationListItem;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function run(action: () => Promise<false | void>) {
    setBusy(true);
    try {
      const result = await action();
      if (result === false) return;
      setOpen(false);
      onChanged();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  const itemCls =
    "block w-full px-3 py-2 text-left text-sm text-ink/80 hover:bg-[#FBF4F6] disabled:opacity-50";

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/70 hover:text-ink"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        Actions
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-white shadow-sm"
        >
          <Link
            href={adminHref(`/organizations/${org.id}/`)}
            className={itemCls}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Voir
          </Link>
          <Link
            href={adminHref(`/organizations/${org.id}/?edit=1`)}
            className={itemCls}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Modifier
          </Link>
          {org.status === "ACTIVE" ? (
            <button
              type="button"
              role="menuitem"
              className={itemCls}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!confirm(`Suspendre « ${org.name} » ?`)) return false;
                  await suspendOrganizationApi(org.id);
                })
              }
            >
              Suspendre
            </button>
          ) : org.status === "SUSPENDED" ? (
            <button
              type="button"
              role="menuitem"
              className={itemCls}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await reactivateOrganizationApi(org.id);
                })
              }
            >
              Réactiver
            </button>
          ) : null}
          <Link
            href={adminHref(`/organizations/${org.id}/?tab=users`)}
            className={itemCls}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Voir utilisateurs
          </Link>
          <Link
            href={adminHref(`/organizations/${org.id}/?tab=subscription`)}
            className={itemCls}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Voir abonnement
          </Link>
          <Link
            href={adminHref(`/organizations/${org.id}/?tab=stats`)}
            className={itemCls}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Voir statistiques
          </Link>
          {org.status !== "ARCHIVED" ? (
            <button
              type="button"
              role="menuitem"
              className={`${itemCls} text-red-700`}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (
                    !confirm(
                      `Désactiver définitivement « ${org.name} » ? L’institut sera archivé.`,
                    )
                  ) {
                    return false;
                  }
                  await archiveOrganizationApi(org.id);
                })
              }
            >
              Désactiver
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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

  return (
    <>
      <AdminPageHeader
        title="Instituts"
        description="Cœur de la plateforme — recherche, filtres et actions."
        action={
          <Link href={adminHref("/organizations/new/")} className="ac-btn">
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
          <li key={org.id} className="ac-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={adminHref(`/organizations/${org.id}/`)}
                  className="font-medium text-ink hover:text-primary"
                >
                  {org.name}
                </Link>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  {org.city ?? "—"} · {org.usersCount} utilisateur
                  {org.usersCount === 1 ? "" : "s"}
                </p>
              </div>
              <OrgRowActions org={org} onChanged={load} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {org.plan ? <PlanBadge plan={org.plan} /> : null}
              <StatusBadge status={org.status} />
              <span className="font-mono text-[10px] text-[var(--admin-muted)]">
                {formatCreated(org.createdAt)}
              </span>
            </div>
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
              <tr key={org.id} className="hover:bg-[#FBF4F6]/50">
                <td className="px-4 py-3">
                  <Link
                    href={adminHref(`/organizations/${org.id}/`)}
                    className="font-medium hover:text-primary"
                  >
                    {org.name}
                  </Link>
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
                  <OrgRowActions org={org} onChanged={load} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
