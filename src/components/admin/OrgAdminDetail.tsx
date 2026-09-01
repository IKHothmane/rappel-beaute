"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PlanBadge, StatusBadge, SubBadge } from "@/components/admin/AdminUi";
import { PLAN_LABEL } from "@/types/subscription";
import type { OrganizationDetail } from "@/types/platform";
import {
  fetchOrganization,
  reactivateOrganizationApi,
  resetOwnerAccessApi,
  suspendOrganizationApi,
} from "@/modules/admin/client";

export function OrgAdminDetail() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"general" | "users" | "subscription">("general");
  const [users, setUsers] = useState<
    { id: string; firstName: string; lastName: string; email: string; role: string; status: string }[]
  >([]);

  async function reload() {
    const { organization } = await fetchOrganization(id);
    setOrg(organization);
  }

  useEffect(() => {
    reload().catch(console.error);
  }, [id]);

  useEffect(() => {
    if (tab !== "users" || !id) return;
    fetch(`/api/admin/organizations/${id}/users/`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(console.error);
  }, [tab, id]);

  if (!org) return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;

  async function onSuspend() {
    if (!org) return;
    if (org.status === "ACTIVE") await suspendOrganizationApi(id);
    else await reactivateOrganizationApi(id);
    await reload();
  }

  async function onResetAccess() {
    const r = await resetOwnerAccessApi(id);
    setActivationUrl(r.activationUrl);
  }

  return (
    <>
      <Link href="/organizations/" className="text-sm text-[var(--admin-accent)]">
        ← Instituts
      </Link>

      <div className="mb-6 mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold md:text-3xl">{org.name}</h1>
            <StatusBadge status={org.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {org.city ?? "—"} · {org.email ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ac-btn-ghost" onClick={onSuspend}>
            {org.status === "ACTIVE" ? "Suspendre" : "Réactiver"}
          </button>
          <button type="button" className="ac-btn-ghost" onClick={onResetAccess}>
            Réinitialiser accès
          </button>
          <Link href={`/organizations/${id}/support/`} className="ac-btn">
            Mode assistance
          </Link>
        </div>
      </div>

      {activationUrl ? (
        <div className="mb-4 ac-card p-4 text-sm">
          <p className="font-medium">Lien d&apos;activation (ne pas partager publiquement)</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--admin-muted)]">{activationUrl}</p>
          <button
            type="button"
            className="ac-btn-ghost mt-2"
            onClick={() => navigator.clipboard?.writeText(activationUrl)}
          >
            Copier le lien
          </button>
        </div>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--admin-line)]">
        {(
          [
            ["general", "Vue générale"],
            ["users", "Utilisateurs"],
            ["subscription", "Abonnement"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 px-3 py-2 text-sm ${
              tab === key ? "text-[var(--admin-accent)]" : "text-[var(--admin-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="ac-card space-y-3 p-5 text-sm">
            <h2 className="font-display text-lg font-semibold">Informations</h2>
            <p>Slug : <span className="font-mono">{org.slug}</span></p>
            <p>Propriétaire : {org.ownerName} ({org.ownerEmail})</p>
            <p>Adresse : {org.address ?? "—"}</p>
            <p>Téléphone : {org.phone ?? "—"}</p>
          </section>
          <section className="ac-card space-y-3 p-5 text-sm">
            <h2 className="font-display text-lg font-semibold">Statistiques</h2>
            <p>Clientes : {org.stats.customers}</p>
            <p>RDV : {org.stats.appointments}</p>
            <p>CA : {org.stats.revenue.toLocaleString("fr-MA")} MAD</p>
            <p>Employées actives : {org.stats.staff}</p>
            <p>Produits actifs : {org.stats.products}</p>
          </section>
        </div>
      ) : null}

      {tab === "users" ? (
        <ul className="ac-card divide-y divide-[var(--admin-line)]">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-[var(--admin-muted)]">{u.email} · {u.role}</p>
              </div>
              <span className="font-mono text-[10px] uppercase">{u.status}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "subscription" && org.subscription ? (
        <section className="ac-card max-w-lg space-y-3 p-5 text-sm">
          <div className="flex items-center gap-2">
            <PlanBadge plan={org.subscription.plan} />
            <SubBadge status={org.subscription.status} />
          </div>
          <p className="font-display text-xl font-semibold">
            {org.subscription?.price.toLocaleString("fr-FR")} MAD / mois
          </p>
          <p>{org.subscription ? PLAN_LABEL[org.subscription.plan] : "—"}</p>
          <p>Début : {new Date(org.subscription.startAt).toLocaleDateString("fr-FR")}</p>
          <p>Renouvellement : {new Date(org.subscription.renewAt).toLocaleDateString("fr-FR")}</p>
        </section>
      ) : null}
    </>
  );
}
