"use client";

import Link from "next/link";
import { useState } from "react";
import { PlanBadge, StatusBadge } from "@/components/admin/AdminUi";
import {
  PLAN_PRICES,
  USERS,
  type Organization,
} from "@/lib/admin-mock";

const TABS = [
  "Vue générale",
  "Utilisateurs",
  "Abonnement",
  "Activité",
  "Rendez-vous",
  "Clientes",
  "Facturation",
  "Sécurité",
] as const;

export function OrgDetailView({ org }: { org: Organization }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Vue générale");
  const orgUsers = USERS.filter((u) => u.orgId === org.id);

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
            {org.city} · {org.email}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button type="button" className="ac-btn-ghost w-full sm:w-auto">
            Modifier
          </button>
          <button type="button" className="ac-btn-ghost w-full sm:w-auto">
            Suspendre
          </button>
          <Link href={`/organizations/${org.id}/support/`} className="ac-btn w-full sm:w-auto">
            Mode assistance
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--admin-line)] pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-sm transition ${
              tab === t
                ? "bg-[var(--admin-card)] text-[var(--admin-accent)]"
                : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Vue générale" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="ac-card space-y-4 p-5 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">Informations institut</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Nom" value={org.name} />
              <Item label="Téléphone" value={org.phone} />
              <Item label="E-mail" value={org.email} />
              <Item label="Adresse" value={org.address} />
              <Item label="Ville" value={org.city} />
              <Item label="Créé le" value={org.createdAt} />
            </dl>
            <hr className="border-[var(--admin-line)]" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                Propriétaire
              </p>
              <p className="mt-1 font-medium">{org.ownerName}</p>
              <p className="text-sm text-[var(--admin-muted)]">{org.ownerEmail}</p>
            </div>
            <hr className="border-[var(--admin-line)]" />
            <div className="flex flex-wrap items-center gap-3">
              <PlanBadge plan={org.plan} />
              <span className="font-mono text-sm">
                {PLAN_PRICES[org.plan].toLocaleString("fr-MA")} MAD / mois
              </span>
            </div>
            <p className="text-sm text-[var(--admin-muted)]">
              Prochaine facturation : {org.nextBilling}
            </p>
          </section>
          <section className="ac-card p-5">
            <h2 className="font-display text-lg font-semibold">Statistiques</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <StatRow label="RDV ce mois" value={String(org.rdvMonth)} />
              <StatRow label="Clientes" value={String(org.customers)} />
              <StatRow
                label="CA"
                value={`${org.revenueMonth.toLocaleString("fr-MA")} MAD`}
              />
              <StatRow label="No-show" value={`${org.noShowRate} %`} />
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "Utilisateurs" ? (
        <div className="ac-card divide-y divide-[var(--admin-line)]">
          {orgUsers.length === 0 ? (
            <p className="p-5 text-sm text-[var(--admin-muted)]">Aucun utilisateur.</p>
          ) : (
            orgUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-[var(--admin-muted)]">{u.email}</p>
                </div>
                <span className="font-mono text-[10px] uppercase text-[var(--admin-muted)]">
                  {u.role}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab !== "Vue générale" && tab !== "Utilisateurs" ? (
        <div className="ac-card p-8 text-sm text-[var(--admin-muted)]">
          Onglet « {tab} » — démonstration (lecture plateforme à brancher).
        </div>
      ) : null}
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
        {label}
      </dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-4">
      <span className="text-[var(--admin-muted)]">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </li>
  );
}
