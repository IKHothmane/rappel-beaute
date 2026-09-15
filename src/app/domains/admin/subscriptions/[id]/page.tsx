"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PlanBadge, SubBadge } from "@/components/admin/AdminUi";
import { adminHref } from "@/lib/admin/href";
import {
  adminSubscriptionAction,
  fetchAdminSubscription,
  type AdminSubscriptionRow,
} from "@/modules/admin/client";
import { platformAuditActionLabel } from "@/types/platform";
import { PLAN_LABEL } from "@/types/subscription";

type Tab = "general" | "payments" | "invoices" | "history";

function parseTab(raw: string | null): Tab {
  if (raw === "payments" || raw === "invoices" || raw === "history") return raw;
  return "general";
}

function DetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params?.id ?? "");
  const tab = parseTab(searchParams.get("tab"));

  const [item, setItem] = useState<AdminSubscriptionRow | null>(null);
  const [history, setHistory] = useState<
    {
      id: string;
      platformUserName: string | null;
      action: string;
      createdAt: string;
      after: unknown;
    }[]
  >([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    const res = await fetchAdminSubscription(id);
    setItem(res.item);
    setHistory(res.history);
  }, [id]);

  useEffect(() => {
    reload().catch(console.error);
  }, [reload]);

  if (!item) {
    return <p className="text-sm text-[var(--admin-muted)]">Chargement…</p>;
  }

  const payments = [
    {
      id: "p1",
      date: item.currentPeriodStart,
      amount: item.priceSnapshot,
      method: "Carte / virement",
      status: item.status === "PAST_DUE" ? "FAILED" : "COMPLETED",
    },
  ];

  return (
    <>
      <Link href={adminHref("/subscriptions/")} className="text-sm text-[var(--admin-accent)]">
        ← Abonnements
      </Link>

      <div className="mb-6 mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold md:text-3xl">
              {item.organizationName}
            </h1>
            <PlanBadge plan={item.planCode} />
            <SubBadge status={item.status as "ACTIVE"} />
          </div>
          <p className="mt-2 font-display text-xl font-semibold">
            {item.priceSnapshot.toLocaleString("fr-FR")} {item.currencySnapshot} / mois
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status === "PAUSED" ? (
            <button
              type="button"
              className="ac-btn"
              disabled={busy}
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await adminSubscriptionAction(id, { action: "reactivate" });
                    await reload();
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              Réactiver
            </button>
          ) : (
            <button
              type="button"
              className="ac-btn-ghost"
              disabled={busy}
              onClick={() =>
                void (async () => {
                  if (!confirm("Suspendre cet abonnement ?")) return;
                  setBusy(true);
                  try {
                    await adminSubscriptionAction(id, { action: "suspend" });
                    await reload();
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              Suspendre
            </button>
          )}
          <Link
            href={adminHref(`/organizations/${item.organizationId}/`)}
            className="ac-btn-ghost"
          >
            Voir l’institut
          </Link>
        </div>
      </div>

      {item.urgency === "soon" ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Abonnement expire dans {item.daysUntilExpiry} jour
          {item.daysUntilExpiry === 1 ? "" : "s"}.
        </div>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--admin-line)]">
        {(
          [
            ["general", "Vue générale"],
            ["payments", "Paiements"],
            ["invoices", "Factures"],
            ["history", "Historique"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={adminHref(
              key === "general"
                ? `/subscriptions/${id}/`
                : `/subscriptions/${id}/?tab=${key}`,
            )}
            className={`shrink-0 px-3 py-2 text-sm ${
              tab === key ? "text-[var(--admin-accent)]" : "text-[var(--admin-muted)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "general" ? (
        <section className="ac-card max-w-xl space-y-3 p-5 text-sm">
          <p>
            <span className="text-[var(--admin-muted)]">Plan</span>
            <br />
            {PLAN_LABEL[item.planCode]} ({item.planCode})
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Début période</span>
            <br />
            {new Date(item.currentPeriodStart).toLocaleDateString("fr-FR")}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Prochaine échéance / expiration</span>
            <br />
            {new Date(item.currentPeriodEnd).toLocaleDateString("fr-FR")}
          </p>
          <p>
            <span className="text-[var(--admin-muted)]">Créé le</span>
            <br />
            {new Date(item.startedAt).toLocaleDateString("fr-FR")}
          </p>
        </section>
      ) : null}

      {tab === "payments" ? (
        <ul className="ac-card divide-y divide-[var(--admin-line)]">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {new Date(p.date).toLocaleDateString("fr-FR")} · {p.amount} DH
                </p>
                <p className="text-xs text-[var(--admin-muted)]">{p.method}</p>
              </div>
              <span
                className={`font-mono text-[10px] uppercase ${
                  p.status === "COMPLETED" ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {p.status}
              </span>
            </li>
          ))}
          <li className="px-5 py-3 text-xs text-[var(--admin-muted)]">
            Pas de ledger SaaS séparé pour l’instant — synthèse basée sur l’abonnement courant.
          </li>
        </ul>
      ) : null}

      {tab === "invoices" ? (
        <p className="ac-card p-5 text-sm text-[var(--admin-muted)]">
          Les factures clientes (POS) restent dans chaque institut. La facturation SaaS plateforme
          arrivera dans un prochain module dédié.
        </p>
      ) : null}

      {tab === "history" ? (
        <ul className="ac-card divide-y divide-[var(--admin-line)]">
          {history.length === 0 ? (
            <li className="px-5 py-4 text-sm text-[var(--admin-muted)]">Aucun historique.</li>
          ) : null}
          {history.map((h) => (
            <li key={h.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{platformAuditActionLabel(h.action)}</p>
                <p className="text-xs text-[var(--admin-muted)]">
                  {h.platformUserName ?? "Système"}
                </p>
              </div>
              <time className="shrink-0 font-mono text-[10px] text-[var(--admin-muted)]">
                {new Date(h.createdAt).toLocaleString("fr-FR")}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export default function AdminSubscriptionDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--admin-muted)]">Chargement…</p>}>
      <DetailInner />
    </Suspense>
  );
}
