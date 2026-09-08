"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { CustomerForm } from "@/components/customers/customer-form";
import { AIMessageComposer } from "@/components/ai/ai-message-composer";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canEditCustomerMarketing, canRedeemLoyalty, canWriteFeatureLimited } from "@/lib/rbac";
import {
  createCustomerNoteApi,
  deleteCustomerNoteApi,
  formatLastVisit,
  getCustomer,
  getCustomerStats,
  getCustomerTimeline,
  listCustomerNotes,
  updateCustomer,
  updateCustomerNoteApi,
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
import type {
  Customer360Stats,
  CustomerNoteItem,
  CustomerTimelineEvent,
} from "@/types/customer-360";
import type { CustomerLoyaltyView, PackageListItem } from "@/types/loyalty";
import type { PaymentItem } from "@/types/finance";
import { PAYMENT_METHOD_LABEL } from "@/types/finance";

const TABS = [
  "Profil",
  "Timeline",
  "Historique",
  "Fidélité",
  "Forfaits",
  "Paiements",
  "Notes",
];

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Terminé",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
  NO_SHOW: "Absent",
  PENDING: "En attente",
  ARRIVED: "Arrivée",
  IN_PROGRESS: "En cours",
};

const KIND_LABEL: Record<string, string> = {
  APPOINTMENT: "RDV",
  PAYMENT: "Paiement",
  INVOICE: "Facture",
  LOYALTY: "Fidélité",
  WHATSAPP: "WhatsApp",
  REVIEW: "Avis",
  PROMOTION: "Promo",
  PACKAGE: "Forfait",
  NOTE: "Note",
  GIFT_CARD: "Carte cadeau",
};

function mad(n: number) {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}

function waLink(phone: string, firstName: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("212")
    ? digits
    : digits.startsWith("0")
      ? `212${digits.slice(1)}`
      : digits;
  const text = encodeURIComponent(`Bonjour ${firstName} 👋`);
  return `https://wa.me/${normalized}?text=${text}`;
}

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "customers");
  const canMarketing = canEditCustomerMarketing(user.role);
  const canRedeem = canRedeemLoyalty(user.role);
  const canGenerateAi = canWriteFeatureLimited(user.role, "ai");

  const [tab, setTab] = useState("Profil");
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [stats, setStats] = useState<Customer360Stats | null>(null);
  const [history, setHistory] = useState<CustomerAppointmentHistory[]>([]);
  const [timeline, setTimeline] = useState<CustomerTimelineEvent[]>([]);
  const [notes, setNotes] = useState<CustomerNoteItem[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyView | null>(null);
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [res, s] = await Promise.all([
        getCustomer(customerId, true),
        getCustomerStats(customerId),
      ]);
      setCustomer(res.customer);
      setHistory(res.history ?? []);
      setStats(s);
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

  const refreshTimeline = useCallback(async () => {
    try {
      setTimeline(await getCustomerTimeline(customerId));
    } catch {
      setTimeline([]);
    }
  }, [customerId]);

  const refreshNotes = useCallback(async () => {
    try {
      setNotes(await listCustomerNotes(customerId));
    } catch {
      setNotes([]);
    }
  }, [customerId]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (["Fidélité", "Forfaits", "Paiements"].includes(tab)) refreshLoyaltyTabs();
    if (tab === "Timeline") refreshTimeline();
    if (tab === "Notes") refreshNotes();
  }, [tab, refreshLoyaltyTabs, refreshTimeline, refreshNotes]);

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

  async function handleAddNote() {
    if (!noteDraft.trim()) return;
    setSubmitting(true);
    const r = await createCustomerNoteApi(customerId, noteDraft.trim());
    setSubmitting(false);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    setNoteDraft("");
    toast("Note ajoutée.", "success");
    refreshNotes();
  }

  async function handleSaveNote(noteId: string, content: string) {
    setSubmitting(true);
    const r = await updateCustomerNoteApi(customerId, noteId, content);
    setSubmitting(false);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    setEditingNoteId(null);
    toast("Note mise à jour.", "success");
    refreshNotes();
  }

  async function handleDeleteNote(noteId: string) {
    setSubmitting(true);
    const r = await deleteCustomerNoteApi(customerId, noteId);
    setSubmitting(false);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    toast("Note supprimée.", "success");
    refreshNotes();
  }

  const s = stats;

  return (
    <>
      <Link href="/customers/" className="text-sm font-semibold text-primary">
        ← Clientes
      </Link>

      <div className="mb-4 mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {customer.segment === "VIP" ? "Cliente VIP · " : ""}
            {customer.status} · {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        {canWrite ? (
          <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setEditOpen(true)}>
            Modifier
          </button>
        ) : null}
      </div>

      {/* Actions rapides */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/agenda/?customerId=${customerId}`} className="btn-primary text-xs sm:text-sm">
          Nouveau RDV
        </Link>
        <a
          href={waLink(customer.phone, customer.firstName)}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost text-xs sm:text-sm"
        >
          WhatsApp
        </a>
        {canGenerateAi ? (
          <button
            type="button"
            className="btn-ghost text-xs sm:text-sm"
            onClick={() => setAiOpen(true)}
          >
            Message IA
          </button>
        ) : null}
        <Link href={`/payments/?customerId=${customerId}`} className="btn-ghost text-xs sm:text-sm">
          Nouveau paiement
        </Link>
        <Link href={`/loyalty/?customerId=${customerId}`} className="btn-ghost text-xs sm:text-sm">
          Ajouter fidélité
        </Link>
        <Link href={`/loyalty/?tab=packages&customerId=${customerId}`} className="btn-ghost text-xs sm:text-sm">
          Ajouter forfait
        </Link>
        {canWrite ? (
          <button
            type="button"
            className="btn-ghost text-xs sm:text-sm"
            onClick={() => {
              setTab("Notes");
              setNoteDraft("");
            }}
          >
            Ajouter une note
          </button>
        ) : null}
        <Link href="/post-visit/" className="btn-ghost text-xs sm:text-sm">
          Relance post-prestation
        </Link>
        <Link href="/reviews/" className="btn-ghost text-xs sm:text-sm">
          Demander un avis
        </Link>
      </div>

      {/* KPIs serveur */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {[
          ["Visites", String(s?.visits ?? customer.visits)],
          ["CA net (LTV)", mad(s?.lifetimeNetRevenue ?? customer.revenue)],
          ["Panier moyen", mad(s?.averageTicket ?? customer.averageTicket)],
          ["Dernière visite", formatLastVisit(s?.lastVisitAt ?? customer.lastVisitAt)],
          ["Prochain RDV", formatLastVisit(s?.nextVisitAt ?? null)],
          ["Points fidélité", String(s?.loyaltyPoints ?? 0)],
          ["Forfaits actifs", String(s?.activePackages ?? 0)],
          ["Cartes cadeaux", String(s?.giftCardsActive ?? 0)],
          ["No-shows", String(s?.noShowCount ?? customer.noShowCount ?? 0)],
          ["Annulations", String(s?.cancellationCount ?? 0)],
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
          <p>
            <span className="text-ink/45">Téléphone / WhatsApp · </span>
            {customer.phone}
          </p>
          {customer.email ? (
            <p>
              <span className="text-ink/45">E-mail · </span>
              {customer.email}
            </p>
          ) : null}
          {customer.birthDate ? (
            <p>
              <span className="text-ink/45">Naissance · </span>
              {new Date(customer.birthDate).toLocaleDateString("fr-FR")}
            </p>
          ) : null}
          {customer.instagram ? (
            <p>
              <span className="text-ink/45">Instagram · </span>
              {customer.instagram}
            </p>
          ) : null}
          {customer.address ? (
            <p>
              <span className="text-ink/45">Adresse · </span>
              {customer.address}
            </p>
          ) : null}
          <p>
            <span className="text-ink/45">Statut · </span>
            {customer.status} · segment {customer.segment}
          </p>
          <p>
            <span className="text-ink/45">Cliente depuis · </span>
            {new Date(customer.createdAt).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </p>
          {(customer.noShowCount ?? 0) > 0 ? (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                customer.noShowRisk === "STRICT" || customer.noShowRisk === "REQUIRE_DEPOSIT"
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-line bg-[#FBF4F6] text-ink/70"
              }`}
            >
              <p className="font-medium">
                No-shows : {customer.noShowCount}
                {customer.noShowRisk === "WARN" ? " · Avertissement" : ""}
                {customer.noShowRisk === "REQUIRE_DEPOSIT" ? " · Acompte obligatoire" : ""}
                {customer.noShowRisk === "STRICT" ? " · Confirmation bloquée sans acompte" : ""}
              </p>
            </div>
          ) : null}
          <div className="border-t border-line pt-3">
            <p className="mb-2 font-medium text-ink/70">Opt-in marketing</p>
            <p>WhatsApp : {customer.marketingWhatsapp ? "Oui" : "Non"}</p>
            <p>E-mail : {customer.marketingEmail ? "Oui" : "Non"}</p>
            <p>SMS : {customer.marketingSms ? "Oui" : "Non"}</p>
          </div>
          {customer.notes ? (
            <div className="border-t border-line pt-3">
              <p className="mb-1 font-medium text-ink/70">Préférences (champ profil)</p>
              <p className="whitespace-pre-wrap text-ink/70">{customer.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "Timeline" ? (
        timeline.length === 0 ? (
          <div className="surface p-5 text-sm text-ink/60">Aucun événement.</div>
        ) : (
          <ul className="surface divide-y divide-line text-sm">
            {timeline.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-primary">
                    {KIND_LABEL[e.kind] ?? e.kind}
                  </p>
                  <p className="font-medium">{e.title}</p>
                  {e.subtitle ? <p className="text-xs text-ink/50">{e.subtitle}</p> : null}
                  <p className="mt-0.5 text-xs text-ink/40">
                    {new Date(e.at).toLocaleString("fr-FR")}
                  </p>
                </div>
                {e.amount != null ? (
                  <span className="shrink-0 font-mono font-semibold">{mad(e.amount)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "Historique" ? (
        history.length === 0 ? (
          <div className="surface p-5 text-sm text-ink/60">Aucun rendez-vous.</div>
        ) : (
          <ul className="surface divide-y divide-line text-sm">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
              >
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
                <span className="font-mono font-semibold">{mad(h.price)}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "Notes" ? (
        <div className="space-y-4">
          <p className="text-xs text-ink/50">
            Notes internes institut uniquement — jamais visibles par la cliente. Chaque
            création / modification / suppression est auditée.
          </p>
          {canWrite ? (
            <div className="surface space-y-2 p-4">
              <textarea
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                rows={3}
                placeholder="Nouvelle note interne…"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <Button type="button" disabled={submitting || !noteDraft.trim()} onClick={handleAddNote}>
                Enregistrer la note
              </Button>
            </div>
          ) : null}
          {notes.length === 0 ? (
            <div className="surface p-5 text-sm text-ink/50">Aucune note pour cette cliente.</div>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="surface p-4 text-sm">
                  {editingNoteId === n.id ? (
                    <NoteEditor
                      initial={n.content}
                      disabled={submitting}
                      onCancel={() => setEditingNoteId(null)}
                      onSave={(c) => handleSaveNote(n.id, c)}
                    />
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{n.content}</p>
                      <p className="mt-2 text-xs text-ink/40">
                        {n.authorName ?? "Équipe"} ·{" "}
                        {new Date(n.createdAt).toLocaleString("fr-FR")}
                      </p>
                      {canWrite ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-primary"
                            onClick={() => setEditingNoteId(n.id)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="text-xs text-ink/50"
                            onClick={() => handleDeleteNote(n.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
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
                <p className="font-mono text-xl">{formatPoints(loyalty.account.balance)}</p>
              </div>
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
                          refresh();
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
                      {t.reason ? <span className="ml-1 text-ink/45">· {t.reason}</span> : null}
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
            <p className="text-ink/50">Aucun point encore.</p>
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
                    {p.sessionUsed} / {p.sessionTotal} utilisées · {p.sessionRemaining} restantes
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
                    {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                    {p.kind === "REFUND" ? " · Remboursement" : ""}
                  </p>
                  <p className="text-xs text-ink/45">
                    {new Date(p.paidAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className="font-mono font-semibold">
                  {p.kind === "REFUND" ? "-" : ""}
                  {mad(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la cliente">
        <CustomerForm
          initial={customer}
          canEditMarketing={canMarketing}
          submitting={submitting}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>

      <Drawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Message IA WhatsApp"
      >
        <AIMessageComposer
          customerId={customer.id}
          customerLabel={`${customer.firstName} ${customer.lastName}`.trim()}
          onTaskCreated={() => setAiOpen(false)}
        />
      </Drawer>
    </>
  );
}

function NoteEditor({
  initial,
  disabled,
  onCancel,
  onSave,
}: {
  initial: string;
  disabled?: boolean;
  onCancel: () => void;
  onSave: (content: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-2">
      <textarea
        className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="button" disabled={disabled || !value.trim()} onClick={() => onSave(value)}>
          Sauver
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
