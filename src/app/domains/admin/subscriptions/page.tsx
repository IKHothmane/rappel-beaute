"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, PlanBadge, StatTile, SubBadge } from "@/components/admin/AdminUi";
import {
  AdminActionsMenu,
  adminMenuItemClass,
} from "@/components/admin/AdminActionsMenu";
import { adminHref } from "@/lib/admin/href";
import {
  adminSubscriptionAction,
  createAdminSubscriptionApi,
  fetchAdminSubscriptions,
  type AdminSubscriptionRow,
} from "@/modules/admin/client";
import { PLAN_LABEL, type SubscriptionPlan } from "@/types/platform";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function UrgencyBadge({ row }: { row: AdminSubscriptionRow }) {
  if (row.urgency === "expired") {
    return (
      <span className="inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-red-800">
        Expiré
      </span>
    );
  }
  if (row.urgency === "soon") {
    return (
      <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-amber-900">
        Bientôt
      </span>
    );
  }
  return <SubBadge status={row.status as "ACTIVE"} />;
}

type ModalKind = "change-plan" | "extend" | "suspend" | "trial" | "create" | "reminder" | null;

export default function AdminSubscriptionsPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [items, setItems] = useState<AdminSubscriptionRow[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    mrr: 0,
  });
  const [plans, setPlans] = useState<{ id: string; code: string; name: string; price: number }[]>(
    [],
  );
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<AdminSubscriptionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPlanId, setNewPlanId] = useState("");
  const [applyAt, setApplyAt] = useState<"now" | "next_period">("now");
  const [months, setMonths] = useState(1);
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const [createOrgId, setCreateOrgId] = useState("");
  const [createPlan, setCreatePlan] = useState<SubscriptionPlan>("INSTITUT");
  const [reminderText, setReminderText] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 280);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminSubscriptions({
      search: q || undefined,
      plan: plan !== "ALL" ? plan : undefined,
      status: status !== "ALL" ? status : undefined,
    })
      .then((res) => {
        setItems(res.items);
        setKpis(res.kpis);
        setPlans(res.plans);
        setOrgs(res.organizations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q, plan, status]);

  useEffect(() => {
    load();
  }, [load]);

  function openModal(kind: ModalKind, row: AdminSubscriptionRow | null = null) {
    setSelected(row);
    setReason("");
    setMonths(1);
    setDays(30);
    setApplyAt("now");
    setNewPlanId(row ? plans.find((p) => p.code !== row.planCode)?.id ?? plans[0]?.id ?? "" : "");
    setReminderText("");
    setModal(kind);
  }

  async function runAction(body: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await adminSubscriptionAction(selected.id, body);
      if (body.action === "reminder" && res.messageTemplate) {
        setReminderText(res.messageTemplate);
        return;
      }
      setModal(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Abonnements"
        description="Gérez les abonnements, plans, paiements et renouvellements de toutes les organisations."
        action={
          <button type="button" className="ac-btn" onClick={() => openModal("create")}>
            + Créer un abonnement
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Total" value={String(kpis.total)} />
        <StatTile label="Actifs" value={String(kpis.active)} />
        <StatTile label="Expirent bientôt" value={String(kpis.expiringSoon)} />
        <StatTile label="Expirés" value={String(kpis.expired)} />
        <StatTile label="MRR" value={`${kpis.mrr.toLocaleString("fr-FR")} MAD`} />
      </div>

      <div className="mb-4 flex flex-col gap-3 ac-card p-4 md:flex-row md:flex-wrap md:items-center">
        <input
          className="ac-input md:min-w-[240px] md:max-w-sm"
          placeholder="Rechercher institut / e-mail…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <select className="ac-input md:w-auto" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="ALL">Plan</option>
          <option value="STARTER">Starter</option>
          <option value="INSTITUT">Institut</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <select
          className="ac-input md:w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">Statut</option>
          <option value="ACTIVE">Actif</option>
          <option value="TRIAL">Essai</option>
          <option value="PAUSED">Suspendu</option>
          <option value="PAST_DUE">Impayé</option>
          <option value="CANCELLED">Annulé</option>
          <option value="EXPIRING_SOON">Expire bientôt</option>
          <option value="EXPIRED_VIEW">Expiré</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-[var(--admin-muted)]">Chargement…</p> : null}

      <div className="hidden overflow-visible ac-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Institut</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Début</th>
                <th className="px-4 py-3 font-medium">Expiration</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Paiement</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-line)]">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-[#FBF4F6]/50">
                  <td className="px-4 py-3">
                    <Link
                      href={adminHref(`/subscriptions/${row.id}/`)}
                      className="font-medium hover:text-primary"
                    >
                      {row.organizationName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={row.planCode} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtDate(row.currentPeriodStart)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtDate(row.currentPeriodEnd)}</td>
                  <td className="px-4 py-3">
                    <UrgencyBadge row={row} />
                  </td>
                  <td className="px-4 py-3 text-xs">{row.paymentLabel}</td>
                  <td className="px-4 py-3 text-right">
                    <AdminActionsMenu>
                      {(close) => (
                        <>
                          <Link
                            href={adminHref(`/subscriptions/${row.id}/`)}
                            className={adminMenuItemClass}
                            onClick={close}
                          >
                            Voir l’abonnement
                          </Link>
                          <button
                            type="button"
                            className={adminMenuItemClass}
                            onClick={() => {
                              close();
                              openModal("change-plan", row);
                            }}
                          >
                            Changer le plan
                          </button>
                          <button
                            type="button"
                            className={adminMenuItemClass}
                            onClick={() => {
                              close();
                              openModal("extend", row);
                            }}
                          >
                            Prolonger
                          </button>
                          <button
                            type="button"
                            className={adminMenuItemClass}
                            onClick={() => {
                              close();
                              openModal("trial", row);
                            }}
                          >
                            Période gratuite
                          </button>
                          {row.status === "PAUSED" ? (
                            <button
                              type="button"
                              className={adminMenuItemClass}
                              onClick={() => {
                                close();
                                void adminSubscriptionAction(row.id, {
                                  action: "reactivate",
                                }).then(load);
                              }}
                            >
                              Réactiver
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={adminMenuItemClass}
                              onClick={() => {
                                close();
                                openModal("suspend", row);
                              }}
                            >
                              Suspendre
                            </button>
                          )}
                          <button
                            type="button"
                            className={adminMenuItemClass}
                            onClick={() => {
                              close();
                              openModal("reminder", row);
                              void adminSubscriptionAction(row.id, { action: "reminder" }).then(
                                (r) => setReminderText(r.messageTemplate ?? ""),
                              );
                            }}
                          >
                            Envoyer un rappel
                          </button>
                          <Link
                            href={adminHref(`/subscriptions/${row.id}/?tab=payments`)}
                            className={adminMenuItemClass}
                            onClick={close}
                          >
                            Voir les paiements
                          </Link>
                          <Link
                            href={adminHref(`/organizations/${row.organizationId}/`)}
                            className={adminMenuItemClass}
                            onClick={close}
                          >
                            Voir l’institut
                          </Link>
                          <button
                            type="button"
                            className={`${adminMenuItemClass} text-red-700`}
                            onClick={() => {
                              close();
                              if (!confirm(`Annuler l’abonnement de ${row.organizationName} ?`)) {
                                return;
                              }
                              void adminSubscriptionAction(row.id, { action: "cancel" }).then(load);
                            }}
                          >
                            Annuler
                          </button>
                        </>
                      )}
                    </AdminActionsMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((row) => (
          <li key={row.id} className="ac-card flex items-start justify-between gap-3 p-4">
            <div>
              <Link
                href={adminHref(`/subscriptions/${row.id}/`)}
                className="font-medium"
              >
                {row.organizationName}
              </Link>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                {PLAN_LABEL[row.planCode]} · expire {fmtDate(row.currentPeriodEnd)}
              </p>
            </div>
            <AdminActionsMenu>
              {(close) => (
                <Link
                  href={adminHref(`/subscriptions/${row.id}/`)}
                  className={adminMenuItemClass}
                  onClick={close}
                >
                  Voir
                </Link>
              )}
            </AdminActionsMenu>
          </li>
        ))}
      </ul>

      {modal && (selected || modal === "create") ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-lg">
            {modal === "change-plan" && selected ? (
              <>
                <h2 className="font-display text-xl font-semibold">Changer le plan</h2>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">{selected.organizationName}</p>
                <p className="mt-4 text-sm">
                  Plan actuel :{" "}
                  <strong>
                    {selected.planCode} — {selected.priceSnapshot} DH/mois
                  </strong>
                </p>
                <label className="mt-4 block text-sm">
                  Nouveau plan
                  <select
                    className="ac-input mt-1"
                    value={newPlanId}
                    onChange={(e) => setNewPlanId(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.price} DH/mois
                      </option>
                    ))}
                  </select>
                </label>
                {(() => {
                  const np = plans.find((p) => p.id === newPlanId);
                  const diff = (np?.price ?? 0) - selected.priceSnapshot;
                  return np ? (
                    <p className="mt-3 text-sm">
                      Différence :{" "}
                      <strong className={diff >= 0 ? "text-emerald-700" : "text-red-700"}>
                        {diff >= 0 ? "+" : ""}
                        {diff} DH/mois
                      </strong>
                    </p>
                  ) : null;
                })()}
                <fieldset className="mt-4 space-y-2 text-sm">
                  <legend className="font-medium">Date d’application</legend>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={applyAt === "now"}
                      onChange={() => setApplyAt("now")}
                    />
                    Maintenant
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={applyAt === "next_period"}
                      onChange={() => setApplyAt("next_period")}
                    />
                    À la prochaine période
                  </label>
                </fieldset>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="ac-btn-ghost" onClick={() => setModal(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="ac-btn"
                    disabled={busy || !newPlanId}
                    onClick={() =>
                      void runAction({
                        action: "change-plan",
                        planId: newPlanId,
                        applyAt,
                      })
                    }
                  >
                    Confirmer
                  </button>
                </div>
              </>
            ) : null}

            {modal === "extend" && selected ? (
              <>
                <h2 className="font-display text-xl font-semibold">Prolonger l’abonnement</h2>
                <p className="mt-3 text-sm">
                  Expiration actuelle : <strong>{fmtDate(selected.currentPeriodEnd)}</strong>
                </p>
                <label className="mt-4 block text-sm">
                  Prolonger de
                  <select
                    className="ac-input mt-1"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    <option value={1}>1 mois</option>
                    <option value={3}>3 mois</option>
                    <option value={6}>6 mois</option>
                    <option value={12}>12 mois</option>
                  </select>
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="ac-btn-ghost" onClick={() => setModal(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="ac-btn"
                    disabled={busy}
                    onClick={() => void runAction({ action: "extend", months })}
                  >
                    Prolonger
                  </button>
                </div>
              </>
            ) : null}

            {modal === "suspend" && selected ? (
              <>
                <h2 className="font-display text-xl font-semibold">Suspendre l’abonnement</h2>
                <p className="mt-2 text-sm">{selected.organizationName}</p>
                <p className="mt-2 text-sm text-amber-800">
                  L’organisation perdra l’accès aux fonctionnalités payantes.
                </p>
                <label className="mt-4 block text-sm">
                  Motif
                  <input
                    className="ac-input mt-1"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Impayé, demande client…"
                  />
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="ac-btn-ghost" onClick={() => setModal(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                    disabled={busy}
                    onClick={() => void runAction({ action: "suspend", reason })}
                  >
                    Suspendre
                  </button>
                </div>
              </>
            ) : null}

            {modal === "trial" && selected ? (
              <>
                <h2 className="font-display text-xl font-semibold">Accorder une période gratuite</h2>
                <p className="mt-2 text-sm">{selected.organizationName}</p>
                <label className="mt-4 block text-sm">
                  Durée (jours)
                  <select
                    className="ac-input mt-1"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    <option value={7}>7 jours</option>
                    <option value={14}>14 jours</option>
                    <option value={30}>30 jours</option>
                    <option value={60}>60 jours</option>
                  </select>
                </label>
                <label className="mt-3 block text-sm">
                  Motif
                  <input
                    className="ac-input mt-1"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Offre commerciale"
                  />
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="ac-btn-ghost" onClick={() => setModal(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="ac-btn"
                    disabled={busy}
                    onClick={() =>
                      void runAction({
                        action: "grant-trial",
                        days,
                        reason: reason || "Offre commerciale",
                      })
                    }
                  >
                    Accorder
                  </button>
                </div>
              </>
            ) : null}

            {modal === "reminder" && selected ? (
              <>
                <h2 className="font-display text-xl font-semibold">Rappel de paiement</h2>
                <p className="mt-2 text-sm text-amber-800">
                  Message préparé — envoi WhatsApp non automatique.
                </p>
                <textarea
                  className="ac-input mt-4 min-h-[160px] font-mono text-xs"
                  value={reminderText}
                  onChange={(e) => setReminderText(e.target.value)}
                />
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="ac-btn-ghost" onClick={() => setModal(null)}>
                    Fermer
                  </button>
                  <button
                    type="button"
                    className="ac-btn"
                    onClick={() => void navigator.clipboard?.writeText(reminderText)}
                  >
                    Copier le message
                  </button>
                </div>
              </>
            ) : null}

            {modal === "create" ? (
              <>
                <h2 className="font-display text-xl font-semibold">Créer un abonnement</h2>
                <label className="mt-4 block text-sm">
                  Institut
                  <select
                    className="ac-input mt-1"
                    value={createOrgId}
                    onChange={(e) => setCreateOrgId(e.target.value)}
                  >
                    <option value="">Choisir…</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-sm">
                  Plan
                  <select
                    className="ac-input mt-1"
                    value={createPlan}
                    onChange={(e) => setCreatePlan(e.target.value as SubscriptionPlan)}
                  >
                    <option value="STARTER">Starter</option>
                    <option value="INSTITUT">Institut</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </label>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="ac-btn-ghost" onClick={() => setModal(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="ac-btn"
                    disabled={busy || !createOrgId}
                    onClick={() =>
                      void (async () => {
                        setBusy(true);
                        try {
                          await createAdminSubscriptionApi({
                            organizationId: createOrgId,
                            planCode: createPlan,
                          });
                          setModal(null);
                          load();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Erreur");
                        } finally {
                          setBusy(false);
                        }
                      })()
                    }
                  >
                    Créer
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
