"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlanBadge, StatusBadge, SubBadge } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import { CITIES } from "@/lib/site";
import { PLAN_LABEL } from "@/types/subscription";
import type { OrganizationDetail } from "@/types/platform";
import {
  archiveOrganizationApi,
  fetchOrganization,
  reactivateOrganizationApi,
  resetOwnerAccessApi,
  suspendOrganizationApi,
  updateOrganizationApi,
} from "@/modules/admin/client";

type Tab = "general" | "users" | "subscription" | "stats";

function parseTab(raw: string | null): Tab {
  if (raw === "users" || raw === "subscription" || raw === "stats") return raw;
  return "general";
}

export function OrgAdminDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const tab = parseTab(searchParams.get("tab"));
  const editing = searchParams.get("edit") === "1";

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [users, setUsers] = useState<
    { id: string; firstName: string; lastName: string; email: string; role: string; status: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });

  const reload = useCallback(async () => {
    if (!id) return;
    const { organization } = await fetchOrganization(id);
    setOrg(organization);
    setForm({
      name: organization.name,
      phone: organization.phone ?? "",
      email: organization.email ?? "",
      address: organization.address ?? "",
      city: organization.city ?? "",
    });
  }, [id]);

  useEffect(() => {
    reload().catch(console.error);
  }, [reload]);

  useEffect(() => {
    if (tab !== "users" || !id) return;
    fetch(`/api/admin/organizations/${id}/users/`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(console.error);
  }, [tab, id]);

  function setTab(next: Tab) {
    const u = new URL(adminHref(`/organizations/${id}/`), "https://local.invalid");
    if (next !== "general") u.searchParams.set("tab", next);
    else u.searchParams.delete("tab");
    u.searchParams.delete("edit");
    router.replace(`${u.pathname}${u.search}`);
  }

  if (!org) return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;

  async function onSuspend() {
    if (!org) return;
    if (org.status === "ACTIVE") {
      if (!confirm(`Suspendre « ${org.name} » ?`)) return;
      await suspendOrganizationApi(id);
    } else if (org.status === "SUSPENDED") {
      await reactivateOrganizationApi(id);
    }
    await reload();
  }

  async function onArchive() {
    if (!org) return;
    if (
      !confirm(`Désactiver « ${org.name} » ? L’institut sera archivé.`)
    ) {
      return;
    }
    await archiveOrganizationApi(id);
    await reload();
  }

  async function onResetAccess() {
    const r = await resetOwnerAccessApi(id);
    setActivationUrl(r.activationUrl);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrganizationApi(id, {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
      });
      await reload();
      router.replace(adminHref(`/organizations/${id}/`));
    } catch (err) {
      console.error(err);
      alert("Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: "Vue générale" },
    { key: "stats", label: "Statistiques" },
    { key: "users", label: "Utilisateurs" },
    { key: "subscription", label: "Abonnement" },
  ];

  return (
    <>
      <Link href={adminHref("/organizations/")} className="text-sm text-[var(--admin-accent)]">
        ← Instituts
      </Link>

      <div className="mb-6 mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold md:text-3xl">{org.name}</h1>
            <StatusBadge status={org.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            {org.city ?? "—"} · {org.email ?? "—"} · {org.usersCount} utilisateur
            {org.usersCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={adminHref(`/organizations/${id}/?edit=1`)} className="ac-btn-ghost">
            Modifier
          </Link>
          {org.status === "ACTIVE" || org.status === "SUSPENDED" ? (
            <button type="button" className="ac-btn-ghost" onClick={() => void onSuspend()}>
              {org.status === "ACTIVE" ? "Suspendre" : "Réactiver"}
            </button>
          ) : null}
          {org.status !== "ARCHIVED" ? (
            <button type="button" className="ac-btn-ghost" onClick={() => void onArchive()}>
              Désactiver
            </button>
          ) : null}
          <button type="button" className="ac-btn-ghost" onClick={() => void onResetAccess()}>
            Réinitialiser accès
          </button>
          <Link href={adminHref(`/organizations/${id}/support/`)} className="ac-btn">
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

      {editing ? (
        <form onSubmit={(e) => void onSave(e)} className="mb-8 ac-card max-w-xl space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Modifier l’institut</h2>
          <label className="block text-sm">
            Nom
            <input
              className="ac-input mt-1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            E-mail
            <input
              type="email"
              className="ac-input mt-1"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Téléphone
            <input
              className="ac-input mt-1"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            Ville
            <select
              className="ac-input mt-1"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            >
              <option value="">—</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Adresse
            <input
              className="ac-input mt-1"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="ac-btn" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <Link href={adminHref(`/organizations/${id}/`)} className="ac-btn-ghost">
              Annuler
            </Link>
          </div>
        </form>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--admin-line)]">
        {tabs.map(({ key, label }) => (
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
        <section className="ac-card max-w-xl space-y-3 p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">Informations</h2>
          <p>
            Slug : <span className="font-mono">{org.slug}</span>
          </p>
          <p>
            Propriétaire : {org.ownerName} ({org.ownerEmail})
          </p>
          <p>Adresse : {org.address ?? "—"}</p>
          <p>Téléphone : {org.phone ?? "—"}</p>
          <p>Formule : {org.plan ? PLAN_LABEL[org.plan] : "—"}</p>
          <p>Créé le : {new Date(org.createdAt).toLocaleDateString("fr-FR")}</p>
        </section>
      ) : null}

      {tab === "stats" ? (
        <section className="ac-card max-w-xl space-y-3 p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">Statistiques</h2>
          <p>Clientes : {org.stats.customers}</p>
          <p>RDV : {org.stats.appointments}</p>
          <p>CA : {org.stats.revenue.toLocaleString("fr-MA")} MAD</p>
          <p>Employées actives : {org.stats.staff}</p>
          <p>Produits actifs : {org.stats.products}</p>
          <p>Utilisateurs : {org.usersCount}</p>
        </section>
      ) : null}

      {tab === "users" ? (
        <ul className="ac-card divide-y divide-[var(--admin-line)]">
          {users.length === 0 ? (
            <li className="px-5 py-4 text-sm text-[var(--admin-muted)]">Aucun utilisateur.</li>
          ) : null}
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {u.firstName} {u.lastName}
                </p>
                <p className="text-xs text-[var(--admin-muted)]">
                  {u.email} · {u.role}
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase">{u.status}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "subscription" ? (
        org.subscription ? (
          <section className="ac-card max-w-lg space-y-3 p-5 text-sm">
            <div className="flex items-center gap-2">
              <PlanBadge plan={org.subscription.plan} />
              <SubBadge status={org.subscription.status} />
            </div>
            <p className="font-display text-xl font-semibold">
              {org.subscription.price.toLocaleString("fr-FR")} MAD / mois
            </p>
            <p>{PLAN_LABEL[org.subscription.plan]}</p>
            <p>Début : {new Date(org.subscription.startAt).toLocaleDateString("fr-FR")}</p>
            <p>Renouvellement : {new Date(org.subscription.renewAt).toLocaleDateString("fr-FR")}</p>
            <Link href={adminHref("/subscriptions/")} className="inline-block text-[var(--admin-accent)]">
              Voir tous les abonnements →
            </Link>
          </section>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Aucun abonnement.</p>
        )
      ) : null}
    </>
  );
}
