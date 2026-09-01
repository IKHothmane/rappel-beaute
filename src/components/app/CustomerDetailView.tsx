"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { CustomerForm } from "@/components/customers/customer-form";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canEditCustomerMarketing, canRedeemLoyalty, canWriteFeatureLimited } from "@/lib/rbac";
import {
  formatLastVisit,
  getCustomer,
  updateCustomer,
} from "@/modules/customers/service";
import {
  formatPoints,
  getCustomerLoyalty,
  getCustomerPackages,
  getCustomerPayments,
  LOYALTY_LEVEL_LABEL,
  LOYALTY_TXN_LABEL,
  redeemReward,
} from "@/modules/loyalty/service";
import type {
  CustomerAppointmentHistory,
  CustomerDetail,
} from "@/types/customer";
import type { CustomerLoyaltyView, PackageListItem } from "@/types/loyalty";
import type { PaymentItem } from "@/types/finance";
import { PAYMENT_METHOD_LABEL } from "@/types/finance";

const TABS = ["Profil", "Historique", "Fidélité", "Forfaits", "Paiements", "Notes"];

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Terminé",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
  NO_SHOW: "Absent",
  PENDING: "En attente",
  ARRIVED: "Arrivée",
  IN_PROGRESS: "En cours",
};

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "customers");
  const canMarketing = canEditCustomerMarketing(user.role);
  const canRedeem = canRedeemLoyalty(user.role);

  const [tab, setTab] = useState("Profil");
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [history, setHistory] = useState<CustomerAppointmentHistory[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyView | null>(null);
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await getCustomer(customerId, true);
      setCustomer(res.customer);
      setHistory(res.history ?? []);
    } catch {
      toast("Cliente introuvable.", "error");
      setCustomer(null);
    }
  }, [customerId, toast]);

  const refreshLoyaltyTabs = useCallback(async () => {
    try {
      const [loy, pkgs, pays] = await Promise.all([
        getCustomerLoyalty(customerId),
        getCustomerPackages(customerId),
        getCustomerPayments(customerId),
      ]);
      setLoyalty(loy);
      setPackages(pkgs);
      setPayments((pays.data as PaymentItem[]) ?? []);
    } catch {
      /* onglets optionnels */
    }
  }, [customerId]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (["Fidélité", "Forfaits", "Paiements"].includes(tab)) {
      refreshLoyaltyTabs();
    }
  }, [tab, refreshLoyaltyTabs]);

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }

  if (!customer) {
    return (
      <div className="surface p-8 text-center">
        <p className="text-sm text-ink/60">Cliente introuvable.</p>
        <Link href="/customers/" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Retour aux clientes
        </Link>
      </div>
    );
  }

  async function handleUpdate(data: Parameters<typeof updateCustomer>[1]) {
    setSubmitting(true);
    const result = await updateCustomer(customerId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setEditOpen(false);
    toast("Profil mis à jour.", "success");
    refresh();
  }

  return (
    <>
      <Link href="/customers/" className="text-sm font-semibold text-primary">
        ← Clientes
      </Link>

      <div className="mb-6 mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {customer.segment === "VIP" ? "Cliente VIP · " : ""}
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canWrite ? (
            <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setEditOpen(true)}>
              Modifier
            </button>
          ) : null}
          <Link href="/agenda/" className="btn-primary w-full text-center sm:w-auto">
            Nouveau RDV
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Visites", String(customer.visits)],
          ["CA", `${customer.revenue.toLocaleString("fr-MA")} MAD`],
          ["Panier moyen", `${customer.averageTicket.toLocaleString("fr-MA")} MAD`],
          ["Dernière visite", formatLastVisit(customer.lastVisitAt)],
        ].map(([l, v]) => (
          <div key={l} className="surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">{l}</p>
            <p className="mt-1 font-mono text-sm font-semibold sm:text-base">{v}</p>
          </div>
        ))}
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "Profil" ? (
        <div className="surface space-y-3 p-5 text-sm sm:p-6">
          <p><span className="text-ink/45">Téléphone · </span>{customer.phone}</p>
          {customer.email ? <p><span className="text-ink/45">E-mail · </span>{customer.email}</p> : null}
          {customer.birthDate ? (
            <p><span className="text-ink/45">Naissance · </span>{new Date(customer.birthDate).toLocaleDateString("fr-FR")}</p>
          ) : null}
          {customer.instagram ? <p><span className="text-ink/45">Instagram · </span>{customer.instagram}</p> : null}
          {customer.address ? <p><span className="text-ink/45">Adresse · </span>{customer.address}</p> : null}
          <p><span className="text-ink/45">Cliente depuis · </span>{new Date(customer.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
          <div className="border-t border-line pt-3">
            <p className="mb-2 font-medium text-ink/70">Marketing</p>
            <p>WhatsApp : {customer.marketingWhatsapp ? "Oui" : "Non"}</p>
            <p>E-mail : {customer.marketingEmail ? "Oui" : "Non"}</p>
            <p>SMS : {customer.marketingSms ? "Oui" : "Non"}</p>
          </div>
        </div>
      ) : null}

      {tab === "Historique" ? (
        history.length === 0 ? (
          <div className="surface p-5 text-sm text-ink/60">Aucun rendez-vous terminé.</div>
        ) : (
          <ul className="surface divide-y divide-line text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                <div>
                  <p className="font-medium">
                    {new Date(h.startAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    — {h.serviceName}
                  </p>
                  <p className="text-xs text-ink/50">{STATUS_LABEL[h.status] ?? h.status}</p>
                </div>
                <span className="font-mono font-semibold">{h.price.toLocaleString("fr-MA")} MAD</span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "Notes" ? (
        <div className="surface p-5 text-sm sm:p-6">
          {customer.notes ? (
            <p className="whitespace-pre-wrap">{customer.notes}</p>
          ) : (
            <p className="text-ink/50">Aucune note pour cette cliente.</p>
          )}
        </div>
      ) : null}

      {tab === "Fidélité" ? (
        <div className="surface space-y-4 p-5 text-sm sm:p-6">
          {loyalty?.account ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/40">Niveau</p>
                <p className="font-display text-2xl font-semibold">
                  {LOYALTY_LEVEL_LABEL[loyalty.account.level]}
                </p>
                <p className="font-mono text-xl">
                  {formatPoints(loyalty.account.balance)}
                </p>
                {loyalty.todayEarned > 0 ? (
                  <p className="text-xs text-emerald-700">
                    +{loyalty.todayEarned} aujourd&apos;hui
                  </p>
                ) : null}
              </div>
              {loyalty.pointsToNextReward != null && loyalty.nextReward ? (
                <p className="rounded-lg border border-line bg-[#FBF4F6]/60 px-3 py-2 text-xs">
                  Prochaine récompense ({loyalty.nextReward.name}) :{" "}
                  {formatPoints(loyalty.pointsToNextReward)}
                </p>
              ) : null}
              {canRedeem && (loyalty.redeemableRewards?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {loyalty.redeemableRewards!.map((rw) => (
                    <button
                      key={rw.id}
                      type="button"
                      className="btn-primary w-full text-sm sm:w-auto"
                      disabled={submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        const r = await redeemReward({
                          customerId,
                          rewardId: rw.id,
                        });
                        setSubmitting(false);
                        if (!r.ok) toast(r.error, "error");
                        else {
                          toast("Récompense utilisée.", "success");
                          refreshLoyaltyTabs();
                        }
                      }}
                    >
                      Utiliser {rw.name} ({formatPoints(rw.pointsCost)})
                    </button>
                  ))}
                </div>
              ) : null}
              <ul className="divide-y divide-line">
                {loyalty.recentTxns.map((t) => (
                  <li key={t.id} className="flex justify-between py-2">
                    <span>
                      {LOYALTY_TXN_LABEL[t.type]}
                      {t.reason ? (
                        <span className="ml-1 text-ink/45">· {t.reason}</span>
                      ) : null}
                    </span>
                    <span className={`font-mono ${t.points >= 0 ? "text-emerald-700" : ""}`}>
                      {t.points >= 0 ? "+" : ""}
                      {t.points}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-ink/50">
              Aucun point encore — les gains se créent au paiement (montant payé).
            </p>
          )}
        </div>
      ) : null}

      {tab === "Forfaits" ? (
        <div className="space-y-3">
          {packages.length === 0 ? (
            <div className="surface p-5 text-sm text-ink/50">Aucun forfait.</div>
          ) : (
            packages.map((p) => {
              const pct = p.sessionTotal
                ? Math.round((p.sessionUsed / p.sessionTotal) * 100)
                : 0;
              return (
                <div key={p.id} className="surface p-5 text-sm">
                  <p className="font-medium">{p.name}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded bg-line/40">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-ink/60">
                    {p.sessionUsed} / {p.sessionTotal} utilisées · {p.sessionRemaining}{" "}
                    restantes
                  </p>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "Paiements" ? (
        payments.length === 0 ? (
          <div className="surface p-5 text-sm text-ink/50">Aucun paiement.</div>
        ) : (
          <ul className="surface divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method} · {p.kind}
                  </p>
                  <p className="text-xs text-ink/45">
                    {new Date(p.paidAt).toLocaleDateString("fr-FR")}
                    {p.serviceName ? ` · ${p.serviceName}` : ""}
                  </p>
                </div>
                <span className="font-mono">
                  {p.kind === "REFUND" ? "-" : ""}
                  {p.amount.toLocaleString("fr-MA")} MAD
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la cliente" side="right">
        <CustomerForm
          initial={customer}
          canEditMarketing={canMarketing}
          submitting={submitting}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </>
  );
}
