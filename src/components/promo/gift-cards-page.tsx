"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Copy,
  Gift,
  Lock,
  MessageCircle,
  MoreVertical,
  PauseCircle,
  Plus,
  Printer,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  type GiftFilter,
  type GiftFormat,
  type GiftSort,
  DISPLAY_STATUS_LABEL,
  EMPTY_GIFT_KPIS,
  PAGE_SIZE,
  avgTicket,
  balanceBefore,
  circulationRate,
  defaultExpiryIso,
  displayPin,
  displayStatus,
  exportGiftJournalCsv,
  filterCards,
  formatJournalStamp,
  formatShortDate,
  giftInsight,
  giftWhatsappText,
  isExpiringSoon,
  isRitual,
  monthDelta,
  offerKind,
  offerLabel,
  posHref,
  posSimulation,
  printGiftCard,
  remainingPct,
  sortCards,
  statusChipClass,
  tabCounts,
  txnLabel,
  usageRate,
  waMeHref,
} from "@/components/promo/gift-cards-helpers";
import { GiftCardsMobile } from "@/components/promo/gift-cards-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWritePromotions } from "@/lib/rbac";
import { cn, formatMad } from "@/lib/utils";
import { listCustomers } from "@/modules/customers/service";
import {
  cancelGiftCard,
  createGiftCard,
  listGiftCards,
} from "@/modules/promo/service";
import type { GiftCardJournalItem, GiftCardKpis, GiftCardListItem } from "@/types/promo";

export function GiftCardsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWritePromotions(user.role);
  const canPos = canAccessNav(user.role, "pos");
  const canWhatsapp = canAccessNav(user.role, "whatsapp");
  const auditRef = useRef<HTMLElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GiftCardListItem[]>([]);
  const [kpis, setKpis] = useState<GiftCardKpis | null>(null);
  const [journal, setJournal] = useState<GiftCardJournalItem[]>([]);
  const [tab, setTab] = useState<GiftFilter>("all");
  const [format, setFormat] = useState<GiftFormat>("all");
  const [sort, setSort] = useState<GiftSort>("issued");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [amount, setAmount] = useState("500");
  const [notes, setNotes] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiryIso());
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const res = await listGiftCards({ limit: 200 });
      setRows(res.data);
      setKpis(res.kpis);
      setJournal(res.journal ?? []);
    } catch {
      toast("Impossible de charger les cartes cadeaux.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!canWrite) return;
    listCustomers({ limit: 100 })
      .then((r) =>
        setCustomers(r.data.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))),
      )
      .catch(() => undefined);
  }, [canWrite]);

  useEffect(() => {
    setPage(0);
  }, [tab, search, format, sort]);

  const kpiSafe = kpis ?? EMPTY_GIFT_KPIS;
  const filtered = useMemo(
    () => sortCards(filterCards(rows, tab, search, format), sort),
    [rows, tab, search, format, sort],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected =
    (selectedId ? filtered.find((c) => c.id === selectedId) ?? rows.find((c) => c.id === selectedId) : undefined) ??
    filtered[0] ??
    null;

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const insight = giftInsight(kpiSafe);
  const counts = tabCounts(rows, kpiSafe);
  const sim = selected ? posSimulation(selected) : null;
  const waText = selected ? giftWhatsappText(selected, user.orgName) : "";
  const waHref = selected ? waMeHref(selected.beneficiaryPhone ?? selected.buyerPhone, waText) : null;

  async function handleCreate() {
    setSubmitting(true);
    const result = await createGiftCard({
      amount: Number(amount),
      buyerCustomerId: buyerId || undefined,
      beneficiaryCustomerId: beneficiaryId || undefined,
      expiresAt: expiresAt || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setCreatedCode(result.card.code);
    toast("Carte cadeau émise.", "success");
    refresh();
  }

  async function handleSuspend(card: GiftCardListItem) {
    if (!canWrite || card.status !== "ACTIVE") return;
    if (!window.confirm(`Suspendre la carte ${card.code} ? L’action est journalisée.`)) return;
    setSubmitting(true);
    const result = await cancelGiftCard(card.id);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Carte suspendue.", "success");
    refresh();
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Message copié.", "success");
    } catch {
      toast("Impossible de copier.", "error");
    }
  }

  function scrollAudit() {
    auditRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("gift-audit-mobile")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleReminders() {
    const expiring = rows.filter(isExpiringSoon);
    if (expiring.length === 0) {
      toast("Aucune carte n’expire sous 30 jours.", "error");
      return;
    }
    setReminderBusy(true);
    const bundle = expiring
      .map((c) => giftWhatsappText(c, user.orgName))
      .join("\n\n—\n\n");
    try {
      await navigator.clipboard.writeText(bundle);
      const first = expiring.find((c) => waMeHref(c.beneficiaryPhone ?? c.buyerPhone, giftWhatsappText(c, user.orgName)));
      const href = first
        ? waMeHref(first.beneficiaryPhone ?? first.buyerPhone, giftWhatsappText(first, user.orgName))
        : null;
      if (href && canWhatsapp) window.open(href, "_blank", "noopener,noreferrer");
      toast(`${expiring.length} invitation${expiring.length > 1 ? "s" : ""} copiée${expiring.length > 1 ? "s" : ""}.`, "success");
    } catch {
      toast("Impossible de préparer les rappels.", "error");
    } finally {
      setReminderBusy(false);
    }
  }

  function handlePrint(card: GiftCardListItem) {
    const ok = printGiftCard(card, user.orgName);
    if (!ok) toast("Autorisez les pop-ups pour imprimer la carte.", "error");
  }

  function openCreate() {
    setCreatedCode(null);
    setAmount("500");
    setNotes("");
    setBuyerId("");
    setBeneficiaryId("");
    setExpiresAt(defaultExpiryIso());
    setCreateOpen(true);
  }

  const mobileProps = {
    orgName: user.orgName,
    roleLabel: ROLE_LABEL[user.role],
    kpis,
    rows,
    journal,
    search: searchInput,
    onSearch: setSearchInput,
    tab,
    onTab: setTab,
    loading,
    selected,
    onSelect: setSelectedId,
    canWrite,
    canPos,
    canWhatsapp,
    onCreate: openCreate,
    onSettings: () => setSettingsOpen(true),
    onScrollAudit: scrollAudit,
    onReminders: handleReminders,
    reminderBusy,
    onCopyWa: copyText,
    onSuspend: handleSuspend,
    onPrint: handlePrint,
  };

  return (
    <>
      <GiftCardsMobile {...mobileProps} />

      <div className="hidden space-y-4 lg:block">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-ink/40">Ventes & croissance</span>
              <span className="text-[#E4BDC2]">/</span>
              <span className="text-primary">Cartes cadeaux & ventes privilèges</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-semibold leading-9 tracking-tight">
                Cartes cadeaux & ventes privilèges
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                <Lock size={12} />
                {ROLE_LABEL[user.role]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E3EF] px-2.5 py-1 text-[11px] font-bold text-primary">
                <Gift size={12} />
                Code unique + PIN
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFDEA4] px-2.5 py-1 text-[11px] font-bold text-[#5D4200]">
                Cash flow immédiat
              </span>
              <span className="rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-bold text-ink/55">
                {user.orgName}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[13px] text-ink/55">
              Émettez, gérez et déduisez les cartes cadeaux en caisse POS pour générer du cash flow anticipé.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={scrollAudit}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
            >
              <BarChart3 size={16} className="text-[#7B5900]" />
              Bilan débits
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-[14px] font-semibold shadow-sm"
            >
              <Settings size={16} />
              Paramètres & validités
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-[14px] font-bold text-white shadow-sm"
              >
                <Plus size={16} />
                Vendre une carte cadeau
              </button>
            ) : null}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl bg-ink p-6 text-[#FEECF7] shadow-sm">
          <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div className="max-w-4xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-[#FFDEA4]">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#FFDEA4]">
                    Copilote IA Prestige
                    <span className="ml-2 rounded-full bg-[#FFDEA4]/20 px-2 py-0.5 text-[10px] font-semibold">
                      Cash-flow & dormance
                    </span>
                  </p>
                  <p className="text-[18px] font-bold text-white">Performance & prévoyance financière</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex items-start gap-2 rounded-lg bg-white/10 p-3 text-[13px]">
                  <Sparkles size={16} className="mt-0.5 shrink-0 text-[#FFDEA4]" />
                  <p>
                    <strong className="text-[#FFDEA4]">{insight.sales}</strong>
                    <br />
                    Trésorerie nette immédiate : <strong className="text-white">{formatMad(insight.cash)}</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-white/10 p-3 text-[13px]">
                  <ShoppingCart size={16} className="mt-0.5 shrink-0 text-[#FFB2BD]" />
                  <p>
                    <strong className="text-[#FFB2BD]">Taux d’usage {insight.usage} %</strong>
                    <br />
                    {kpiSafe.usedCount} carte{kpiSafe.usedCount > 1 ? "s" : ""} soldée
                    {kpiSafe.usedCount > 1 ? "s" : ""} · solde encore {formatMad(kpiSafe.remainingBalance)}.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-[#BA1A1A]/20 p-3 text-[13px]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#FFDEA4]" />
                <p>
                  <strong className="text-[#FFDEA4]">Alerte dormance :</strong> {insight.expiringLabel}
                </p>
              </div>
            </div>
            <div className="flex min-w-[240px] flex-col gap-2">
              {canWhatsapp && insight.expiring > 0 ? (
                <button
                  type="button"
                  disabled={reminderBusy}
                  onClick={handleReminders}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#FFDEA4] px-4 text-[14px] font-bold text-[#261900] disabled:opacity-60"
                >
                  <MessageCircle size={16} />
                  Déclencher rappels WhatsApp
                </button>
              ) : null}
              <button
                type="button"
                onClick={scrollAudit}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-4 text-[13px] font-semibold text-white hover:bg-white/15"
              >
                Consulter l’audit financier
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Actives en cours"
            value={String(kpiSafe.activeCount)}
            hint={`${circulationRate(kpiSafe)} % / ${kpiSafe.soldCount} émises`}
            icon={<Gift size={18} className="text-primary" />}
          />
          <Kpi
            label="Solde engagé"
            value={kpiSafe.remainingBalance.toLocaleString("fr-MA")}
            hint="Trésorerie encaissée 100 %"
            icon={<Wallet size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Ventes du mois"
            value={String(kpiSafe.soldThisMonth)}
            hint={`${monthDelta(kpiSafe) >= 0 ? "+" : ""}${monthDelta(kpiSafe)} vs M-1`}
            icon={<ShoppingCart size={18} className="text-primary" />}
          />
          <Kpi
            label="CA direct encaissé"
            value={kpiSafe.soldValueThisMonth.toLocaleString("fr-MA")}
            hint={kpiSafe.soldThisMonth ? `Panier ${formatMad(avgTicket(kpiSafe))}` : "Ce mois"}
            icon={<Wallet size={18} className="text-[#7B5900]" />}
          />
          <Kpi
            label="Taux d’usage"
            value={`${usageRate(kpiSafe)} %`}
            hint={`${kpiSafe.usedCount} cartes soldées`}
            icon={<Sparkles size={18} className="text-ink/40" />}
          />
          <Kpi
            label="Fin de validité"
            value={String(kpiSafe.expiringSoonCount)}
            hint={`< 30 j · ${formatMad(kpiSafe.expiringSoonBalance)}`}
            icon={<AlertTriangle size={18} className="text-[#BA1A1A]" />}
            danger={kpiSafe.expiringSoonCount > 0}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-8">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  ["all", `Toutes les cartes (${counts.all})`],
                  ["active", `Actives avec solde (${counts.active})`],
                  ["used", `Consommées (${counts.used})`],
                  ["ritual", `Packs & rituels (${counts.ritual})`],
                  ["expiring", `Expirant bientôt (${counts.expiring})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-semibold",
                    tab === id ? "bg-primary text-white shadow-sm" : "bg-white text-ink/60 shadow-sm",
                    id === "expiring" && tab !== "expiring" && "text-[#BA1A1A]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Rechercher code, cliente, bénéficiaire…"
                  className="h-11 w-full rounded-lg bg-[#FFF7F9] pl-10 pr-4 text-[13px] outline-none"
                />
              </div>
              <Select value={format} onChange={(e) => setFormat(e.target.value as GiftFormat)}>
                <option value="all">Tous formats</option>
                <option value="amount">Cartes montant</option>
                <option value="ritual">Rituels & soins dédiés</option>
              </Select>
              <Select value={sort} onChange={(e) => setSort(e.target.value as GiftSort)}>
                <option value="issued">Trier : date d’émission</option>
                <option value="balance">Trier : solde décroissant</option>
                <option value="expiry">Trier : expiration proche</option>
              </Select>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              {loading ? (
                <p className="p-8 text-center text-sm text-ink/50">Chargement…</p>
              ) : pageRows.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink/50">Aucune carte cadeau.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-[13px]">
                    <thead className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                      <tr>
                        <th className="px-4 py-3">N° carte & PIN</th>
                        <th className="px-3 py-3">Modèle & offre</th>
                        <th className="px-3 py-3">Acheteur / Bénéficiaire</th>
                        <th className="px-3 py-3 text-right">Valeur initiale</th>
                        <th className="px-3 py-3">Solde & jauge</th>
                        <th className="px-3 py-3">Validité</th>
                        <th className="px-3 py-3 text-center">Statut</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((card) => {
                        const st = displayStatus(card);
                        const pct = remainingPct(card);
                        const active = selected?.id === card.id;
                        return (
                          <tr
                            key={card.id}
                            onClick={() => setSelectedId(card.id)}
                            className={cn(
                              "cursor-pointer border-t border-[#FFEFF8] transition-colors",
                              active ? "bg-[#FFEFF8]/80" : "hover:bg-[#FFEFF8]/40",
                              st === "urgent" && "bg-[#FFDAD6]/30",
                              card.status === "USED" && "opacity-70",
                            )}
                          >
                            <td className="px-4 py-4">
                              <p className="font-mono font-bold tracking-tight">{card.code}</p>
                              <p className="font-mono text-[11px] text-ink/40">PIN {displayPin(card.code)}</p>
                            </td>
                            <td className="px-3 py-4">
                              <p className="font-semibold">{offerLabel(card)}</p>
                              <p className="text-[11px] font-bold text-[#7B5900]">{offerKind(card)}</p>
                            </td>
                            <td className="px-3 py-4">
                              <p className="font-bold">{card.beneficiaryName ?? "—"}</p>
                              <p className="text-[11px] text-ink/45">
                                {card.buyerName ? `Offert par ${card.buyerName}` : "Sans acheteur"}
                              </p>
                            </td>
                            <td className="px-3 py-4 text-right font-bold">{formatMad(card.initialValue)}</td>
                            <td className="min-w-[140px] px-3 py-4">
                              <div className="mb-1 flex justify-between text-[11px] font-semibold">
                                <span className={st === "urgent" ? "text-[#BA1A1A]" : "text-primary"}>
                                  {isRitual(card) && pct === 100 ? "1 rituel" : formatMad(card.balance)}
                                </span>
                                <span className="text-ink/40">{pct}% dispo</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
                                <div
                                  className={cn("h-full rounded-full", st === "urgent" ? "bg-[#BA1A1A]" : "bg-primary")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-4 text-[11px]">
                              <p>Émise {formatShortDate(card.createdAt)}</p>
                              <p className={st === "urgent" ? "font-bold text-[#BA1A1A]" : "text-ink/45"}>
                                {st === "used" ? "Terminée" : `Exp. ${formatShortDate(card.expiresAt)}`}
                              </p>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", statusChipClass(st))}>
                                {DISPLAY_STATUS_LABEL[st]}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              {canPos && card.status === "ACTIVE" ? (
                                <Link
                                  href={posHref(card.beneficiaryCustomerId)}
                                  className="inline-flex rounded-lg bg-primary p-1.5 text-white"
                                  title="Déduire au POS"
                                >
                                  <ShoppingCart size={16} />
                                </Link>
                              ) : st === "urgent" && canWhatsapp ? (
                                <button
                                  type="button"
                                  className="inline-flex rounded-lg bg-[#FCE9F4] p-1.5 text-primary"
                                  title="Relancer"
                                  onClick={() => copyText(giftWhatsappText(card, user.orgName))}
                                >
                                  <MessageCircle size={16} />
                                </button>
                              ) : (
                                <button type="button" className="inline-flex rounded-lg bg-[#FCE9F4] p-1.5 text-ink/40" title="Détails">
                                  <MoreVertical size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-between bg-[#FFEFF8] px-4 py-2 text-[12px] text-ink/50">
                <span>
                  {filtered.length === 0
                    ? "0 carte"
                    : `Affichage ${page * PAGE_SIZE + 1}–${Math.min(filtered.length, page * PAGE_SIZE + PAGE_SIZE)} sur ${filtered.length}`}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="rounded bg-white px-2.5 py-1 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <span className="rounded bg-primary px-2.5 py-1 font-bold text-white">
                    {page + 1}/{pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded bg-white px-2.5 py-1 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-4">
            {selected ? (
              <>
                <LuxuryPreview card={selected} orgName={user.orgName} />
                <div className="grid grid-cols-4 gap-1">
                  {canPos ? (
                    <Link
                      href={posHref(selected.beneficiaryCustomerId)}
                      className="flex flex-col items-center rounded-xl bg-white p-2 text-[10px] font-semibold shadow-sm"
                    >
                      <ShoppingCart size={16} className="mb-1 text-primary" />
                      Déduire POS
                    </Link>
                  ) : (
                    <span className="flex flex-col items-center rounded-xl bg-white p-2 text-[10px] text-ink/30 shadow-sm">
                      Déduire
                    </span>
                  )}
                  {canWhatsapp && waHref ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center rounded-xl bg-white p-2 text-[10px] font-semibold shadow-sm"
                    >
                      <MessageCircle size={16} className="mb-1 text-[#7B5900]" />
                      WhatsApp
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => copyText(waText)}
                      className="flex flex-col items-center rounded-xl bg-white p-2 text-[10px] font-semibold shadow-sm"
                    >
                      <Copy size={16} className="mb-1 text-[#7B5900]" />
                      Copier
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePrint(selected)}
                    className="flex flex-col items-center rounded-xl bg-white p-2 text-[10px] font-semibold shadow-sm"
                  >
                    <Printer size={16} className="mb-1 text-ink/50" />
                    PDF cadeau
                  </button>
                  {canWrite && selected.status === "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSuspend(selected)}
                      className="flex flex-col items-center rounded-xl bg-white p-2 text-[10px] font-semibold shadow-sm"
                    >
                      <PauseCircle size={16} className="mb-1 text-[#BA1A1A]" />
                      Suspendre
                    </button>
                  ) : (
                    <span className="flex flex-col items-center rounded-xl bg-white p-2 text-[10px] text-ink/30 shadow-sm">
                      —
                    </span>
                  )}
                </div>

                {sim ? (
                  <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="inline-flex items-center gap-1 text-[16px] font-bold">
                        <ShoppingCart size={16} className="text-primary" />
                        Simulation POS
                      </p>
                      <span className="rounded bg-[#F6E3EF] px-2 py-0.5 text-[11px] text-ink/45">{sim.ticket}</span>
                    </div>
                    <p className="text-[12px] text-ink/50">
                      Encaissement pour <strong className="text-ink">{selected.beneficiaryName ?? "la bénéficiaire"}</strong>
                    </p>
                    <div className="space-y-1 rounded-lg bg-[#FFEFF8] p-3 text-[13px]">
                      <div className="flex justify-between">
                        <span>Soin visage Hydrafacial Prestige</span>
                        <span className="font-bold">{formatMad(sim.line1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Manucure russe haute précision</span>
                        <span className="font-bold">{formatMad(sim.line2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#E4BDC2]/40 pt-1 text-ink/50">
                        <span>Total brut</span>
                        <span className="font-semibold text-ink">{formatMad(sim.total)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-primary">
                        <span>Déduction {selected.code}</span>
                        <span>-{formatMad(sim.deduction)}</span>
                      </div>
                      <div className="flex justify-between border-t border-[#E4BDC2]/40 pt-1 font-bold">
                        <span>Reste à régler</span>
                        <span className="text-primary">{formatMad(sim.remainder)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between rounded-lg bg-[#F6E3EF] px-3 py-2 text-[13px]">
                      <span className="text-ink/50">Nouveau solde</span>
                      <span className="font-mono font-bold text-[#7B5900]">{formatMad(sim.newBalance)}</span>
                    </div>
                    {canPos ? (
                      <Link
                        href={posHref(selected.beneficiaryCustomerId)}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-[14px] font-bold text-white"
                      >
                        Encaisser & déduire dans le POS
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl bg-white p-4 text-[13px] text-ink/45 shadow-sm">
                    Sélectionnez une carte active pour simuler la déduction POS.
                  </div>
                )}

                <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-1 text-[16px] font-bold">
                      <MessageCircle size={16} className="text-[#7B5900]" />
                      WhatsApp bénéficiaire
                    </p>
                    <span className="rounded-full bg-[#FFDEA4]/50 px-2 py-0.5 text-[10px] font-bold text-[#5D4200]">
                      1-clic concierge
                    </span>
                  </div>
                  <p className="text-[12px] text-ink/45">Prêt à envoyer avec consentement (CNDP 09-08).</p>
                  <p className="rounded-lg border-l-2 border-primary bg-[#FFF7F9] p-3 text-[13px] leading-relaxed">
                    {waText}
                  </p>
                  <div className="flex gap-2">
                    {canWhatsapp && waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-ink text-[13px] font-bold text-white"
                      >
                        Ouvrir WhatsApp
                      </a>
                    ) : (
                      <span className="flex h-10 flex-1 items-center justify-center rounded-lg bg-[#FCE9F4] text-[12px] text-ink/40">
                        Pas de numéro
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => copyText(waText)}
                      className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#F6E3EF] px-3 text-[13px] font-semibold"
                    >
                      <Copy size={14} />
                      Copier
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">
                Sélectionnez une carte cadeau.
              </div>
            )}
          </div>
        </section>

        <section ref={auditRef} className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F6E3EF] text-primary">
                <Lock size={20} />
              </span>
              <div>
                <h3 className="text-[18px] font-bold">Journal d’audit immuable des mouvements</h3>
                <p className="text-[13px] text-ink/50">
                  Traçabilité anti-fraude : interdiction de solde négatif, débits horodatés.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
              Conformité CNDP 09-08
            </span>
          </div>
          {journal.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/50">Aucun mouvement pour l’instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead className="bg-[#FCE9F4] text-[11px] font-bold uppercase text-ink/45">
                  <tr>
                    <th className="px-3 py-2">Horodatage</th>
                    <th className="px-3 py-2">N° carte</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                    <th className="px-3 py-2">Solde avant → après</th>
                    <th className="px-3 py-2">Ticket</th>
                    <th className="px-3 py-2">Opératrice</th>
                    <th className="px-3 py-2 text-right">Empreinte</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.map((row) => (
                    <tr key={row.id} className="border-t border-[#FFEFF8]">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink/45">
                        {formatJournalStamp(row.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold">{row.code}</td>
                      <td className="px-3 py-2 font-semibold">{txnLabel(row.type)}</td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-bold",
                          row.amount >= 0 ? "text-[#7B5900]" : "text-primary",
                        )}
                      >
                        {row.amount > 0 ? "+" : ""}
                        {formatMad(row.amount)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {formatMad(balanceBefore(row))} → {formatMad(row.balanceAfter)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#7B5900]">{row.paymentId ?? row.reason ?? "—"}</td>
                      <td className="px-3 py-2">{row.actorName ?? "Système"}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-ink/40" title={row.proofHash}>
                        {row.proofHash.slice(0, 12)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-[#E4BDC2]/30 pt-3 text-[12px] text-ink/50">
            <p>Les erreurs se corrigent par contrepassation auditée — aucune suppression manuelle.</p>
            <button
              type="button"
              onClick={() => exportGiftJournalCsv(journal)}
              className="font-bold text-primary hover:underline"
            >
              Exporter le grand livre (CSV)
            </button>
          </div>
        </section>
      </div>

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createdCode ? "Carte émise" : "Vendre une carte cadeau"}
      >
        {createdCode ? (
          <div className="space-y-4 text-center text-sm">
            <p className="text-ink/60">Code généré — PIN {displayPin(createdCode)}</p>
            <p className="font-mono text-lg font-bold text-primary">{createdCode}</p>
            <p className="font-semibold">{formatMad(Number(amount))}</p>
            <Button type="button" variant="primary" className="w-full" onClick={() => setCreateOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1.5 block font-medium">Montant (MAD)</span>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Modèle / offre</span>
              <Input
                placeholder="Anniversaire Prestige, Hammam Royal…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Acheteur</span>
              <Select value={buyerId} onChange={(e) => setBuyerId(e.target.value)}>
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Bénéficiaire</span>
              <Select value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}>
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Expiration</span>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={submitting || !amount}
              onClick={handleCreate}
            >
              Émettre et encaisser
            </Button>
          </div>
        )}
      </Drawer>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Paramètres & validités">
        <div className="space-y-3 text-sm text-ink/70">
          <p>
            Validité par défaut : <strong>12 mois</strong> à compter de l’émission. Le PIN affiché est dérivé du code
            unique — il n’est pas stocké en clair.
          </p>
          <p>
            Le solde ne peut jamais devenir négatif : la déduction POS est plafonnée côté serveur. Toute suspension
            produit une ligne d’audit.
          </p>
          {canWrite ? (
            <Button type="button" variant="primary" className="w-full" onClick={() => { setSettingsOpen(false); openCreate(); }}>
              Vendre une carte
            </Button>
          ) : null}
        </div>
      </Drawer>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  danger,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-ink/40">
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={cn("text-[28px] font-extrabold leading-none", danger && "text-[#BA1A1A]")}>{value}</p>
      <p className={cn("mt-2 text-[12px]", danger ? "font-bold text-[#BA1A1A]" : "text-ink/45")}>{hint}</p>
    </div>
  );
}

function LuxuryPreview({ card, orgName }: { card: GiftCardListItem; orgName: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink p-4 text-[#FEECF7] shadow-lg">
      <div className="relative z-10 flex h-56 flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-tight text-[#FFDEA4]">
              {orgName || "Rappel Beauté"}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-white/60">Carte privilège</p>
          </div>
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Privilège</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FFDEA4]/80">Solde disponible</p>
          <p className="text-[32px] font-extrabold leading-tight text-white">
            {card.balance.toLocaleString("fr-MA")} <span className="text-[18px] text-[#FFDEA4]">DH</span>
          </p>
          <p className="text-[11px] text-white/50">Valeur initiale : {formatMad(card.initialValue)}</p>
        </div>
        <div className="flex items-end justify-between border-t border-[#FFDEA4]/20 pt-2">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[#FFDEA4]/80">Bénéficiaire</p>
            <p className="text-[13px] font-bold text-white">{card.beneficiaryName ?? "—"}</p>
            <p className="text-[10px] text-white/50">{card.buyerName ? `Offert par ${card.buyerName}` : offerLabel(card)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[13px] font-bold tracking-wider text-[#FFDEA4]">{card.code}</p>
            <p className="font-mono text-[10px] text-white/70">PIN {displayPin(card.code)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
