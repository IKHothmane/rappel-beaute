"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import type { OrganizationDetail } from "@/types/platform";
import {
  archiveOrganizationApi,
  fetchOrganization,
  reactivateOrganizationApi,
  resetOwnerAccessApi,
  suspendOrganizationApi,
} from "@/modules/admin/client";

type ActionItem = {
  key: string;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void | Promise<void>;
  danger?: boolean;
  hidden?: boolean;
};

export default function OrganizationActionsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    const { organization } = await fetchOrganization(id);
    setOrg(organization);
  }, [id]);

  useEffect(() => {
    reload().catch(console.error);
  }, [reload]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      await reload();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  if (!org) {
    return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;
  }

  const actions: ActionItem[] = [
    {
      key: "view",
      label: "Voir",
      description: "Fiche complète de l’institut",
      href: adminHref(`/organizations/${id}/`),
    },
    {
      key: "edit",
      label: "Modifier",
      description: "Nom, contact, adresse, ville",
      href: adminHref(`/organizations/${id}/?edit=1`),
    },
    {
      key: "suspend",
      label: "Suspendre",
      description: "Bloquer temporairement l’accès institut",
      hidden: org.status !== "ACTIVE",
      onClick: () =>
        run("suspend", async () => {
          if (!confirm(`Suspendre « ${org.name} » ?`)) return;
          await suspendOrganizationApi(id);
        }),
    },
    {
      key: "reactivate",
      label: "Réactiver",
      description: "Rétablir l’accès après suspension",
      hidden: org.status !== "SUSPENDED",
      onClick: () =>
        run("reactivate", async () => {
          await reactivateOrganizationApi(id);
        }),
    },
    {
      key: "users",
      label: "Voir utilisateurs",
      description: "Comptes liés à cet institut",
      href: adminHref(`/organizations/${id}/?tab=users`),
    },
    {
      key: "subscription",
      label: "Voir abonnement",
      description: "Plan, statut et renouvellement",
      href: adminHref(`/organizations/${id}/?tab=subscription`),
    },
    {
      key: "stats",
      label: "Voir statistiques",
      description: "Clientes, RDV, CA, équipe",
      href: adminHref(`/organizations/${id}/?tab=stats`),
    },
    {
      key: "reset",
      label: "Réinitialiser accès",
      description: "Nouveau lien d’activation propriétaire",
      onClick: () =>
        run("reset", async () => {
          const r = await resetOwnerAccessApi(id);
          setActivationUrl(r.activationUrl);
        }),
    },
    {
      key: "support",
      label: "Mode assistance",
      description: "Ouvrir une session support",
      href: adminHref(`/organizations/${id}/support/`),
    },
    {
      key: "archive",
      label: "Désactiver",
      description: "Archiver l’institut (désactivation)",
      danger: true,
      hidden: org.status === "ARCHIVED",
      onClick: () =>
        run("archive", async () => {
          if (!confirm(`Désactiver « ${org.name} » ? L’institut sera archivé.`)) return;
          await archiveOrganizationApi(id);
          router.push(adminHref("/organizations/"));
        }),
    },
  ];

  const visible = actions.filter((a) => !a.hidden);

  return (
    <>
      <Link href={adminHref("/organizations/")} className="text-sm text-[var(--admin-accent)]">
        ← Instituts
      </Link>

      <div className="mb-6 mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Actions</h1>
        <StatusBadge status={org.status} />
      </div>
      <p className="mb-6 text-sm text-[var(--admin-muted)]">
        {org.name}
        {org.city ? ` · ${org.city}` : ""}
      </p>

      {activationUrl ? (
        <div className="mb-6 ac-card p-4 text-sm">
          <p className="font-medium">Lien d’activation</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--admin-muted)]">{activationUrl}</p>
          <button
            type="button"
            className="ac-btn-ghost mt-2"
            onClick={() => void navigator.clipboard?.writeText(activationUrl)}
          >
            Copier
          </button>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {visible.map((action) => {
          const className = `ac-card flex flex-col items-start gap-1 p-4 text-left transition hover:border-primary/30 ${
            action.danger ? "hover:border-red-300" : ""
          }`;
          const body = (
            <>
              <span
                className={`text-sm font-semibold ${action.danger ? "text-red-700" : "text-ink"}`}
              >
                {action.label}
              </span>
              <span className="text-xs text-[var(--admin-muted)]">{action.description}</span>
            </>
          );

          if (action.href) {
            return (
              <li key={action.key}>
                <Link href={action.href} className={className}>
                  {body}
                </Link>
              </li>
            );
          }

          return (
            <li key={action.key}>
              <button
                type="button"
                className={`${className} w-full disabled:opacity-50`}
                disabled={busy !== null}
                onClick={() => void action.onClick?.()}
              >
                {busy === action.key ? "…" : body}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
