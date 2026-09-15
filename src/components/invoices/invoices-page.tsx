"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Ban,
  Download,
  FileText,
  Link2,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Undo2,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  INVOICE_PAGE_SIZE,
  type InvoicePeriod,
  type InvoiceTab,
  downloadInvoiceHtml,
  exportInvoicesCsv,
  formatInvoiceDate,
  formatInvoiceDateTime,
  formatInvoiceTime,
  invoiceInsight,
  invoiceStatusChip,
  invoiceWhen,
  matchesInvoiceTab,
  methodLabel,
  periodLabel,
  periodRange,
  printInvoiceHtml,
  priorityInvoices,
  reminderText,
  staffOptions,
  tabCounts as countTabs,
  waMeLink,
} from "@/components/invoices/invoice-helpers";
import { InvoicesMobile } from "@/components/invoices/invoices-mobile";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteCashRegister } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  createPayments,
  formatMad as formatPayMad,
  listBillableAppointments,
  newIdempotencyKey,
  PAYMENT_METHOD_LABEL,
} from "@/modules/finance/service";
import {
  createInvoiceFromAppointment,
  formatMad,
  getInvoice,
  INVOICE_STATUS_LABEL,
  listInvoices,
  voidInvoice,
} from "@/modules/invoices/service";
import type { PaymentMethod } from "@/types/finance";
import { PAYMENT_METHODS } from "@/types/finance";
import type { InvoiceDetail, InvoiceKpis, InvoiceListItem } from "@/types/invoice";

type Billable = Awaited<ReturnType<typeof listBillableAppointments>>[number];

export function InvoicesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCashRegister(user.role);
  const canPayments = canAccessNav(user.role, "payments");
  const canCustomers = canAccessNav(user.role, "customers");
  const canPos = canAccessNav(user.role, "pos");
  const canCash = canAccessNav(user.role, "cash-register");

  const searchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<InvoicePeriod>("month");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [staff, setStaff] = useState("");
  const [tab, setTab] = useState<InvoiceTab>("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InvoiceListItem[]>([]);
  const [kpis, setKpis] = useState<InvoiceKpis | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [billable, setBillable] = useState<Billable[]>([]);
  const [createAptId, setCreateAptId] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const [collectOpen, setCollectOpen] = useState(false);
  const [collectAptId, setCollectAptId] = useState("");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>("CASH");
  const [collectBillable, setCollectBillable] = useState<Billable[]>([]);

  const [voidTarget, setVoidTarget] = useState<InvoiceListItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const range = periodRange(period);
      const res = await listInvoices({
        search: search || undefined,
        method: method || undefined,
        from: range.from,
        to: range.to,
        limit: 80,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les factures.", "error");
    }
  }, [search, method, period, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    setPage(1);
    setSelectedId(null);
  }, [search, method, period, tab, staff]);

  const operators = useMemo(() => staffOptions(rows), [rows]);
  const staffScoped = useMemo(
    () => (staff ? rows.filter((r) => (r.staffName ?? "") === staff) : rows),
    [rows, staff],
  );
  const counts = useMemo(() => countTabs(staffScoped), [staffScoped]);
  const filtered = useMemo(
    () => staffScoped.filter((r) => matchesInvoiceTab(r, tab)),
    [staffScoped, tab],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / INVOICE_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * INVOICE_PAGE_SIZE, page * INVOICE_PAGE_SIZE);
  const selected =
    (selectedId ? filtered.find((r) => r.id === selectedId) : undefined) ??
    paged[0] ??
    filtered[0] ??
    null;
  const insight = useMemo(() => invoiceInsight(kpis), [kpis]);
  const priority = useMemo(() => priorityInvoices(staffScoped), [staffScoped]);
  const priorityTotal = useMemo(
    () => priority.reduce((s, p) => s + p.remaining, 0),
    [priority],
  );

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getInvoice(selected.id)
      .then((inv) => {
        if (!cancelled) setDetail(inv);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  async function openCreate() {
    try {
      const list = await listBillableAppointments();
      setBillable(list);
      setCreateAptId(list[0]?.id ?? "");
      setCreateNotes("");
      setCreateOpen(true);
    } catch {
      toast("Impossible de charger les rendez-vous facturables.", "error");
    }
  }

  async function handleCreate() {
    if (!createAptId) return;
    setSubmitting(true);
    const result = await createInvoiceFromAppointment({
      appointmentId: createAptId,
      notes: createNotes || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setCreateOpen(false);
    toast(result.created ? "Facture émise." : "Facture déjà existante pour ce rendez-vous.", "success");
    setSelectedId(result.invoice.id);
    await refresh();
  }

  async function openCollect(inv: InvoiceListItem) {
    if (!inv.appointmentId) {
      toast("Cette facture n’est pas liée à un rendez-vous — encaissement via Paiements.", "error");
      return;
    }
    try {
      const list = await listBillableAppointments();
      let next = list;
      if (!list.some((b) => b.id === inv.appointmentId)) {
        next = [
          {
            id: inv.appointmentId,
            customerName: inv.customerName,
            serviceName: inv.firstItemName ?? "Rendez-vous",
            price: inv.total,
            remaining: inv.remaining,
            status: inv.status,
            startAt: invoiceWhen(inv),
          },
          ...list,
        ];
      }
      setCollectBillable(next);
      setCollectAptId(inv.appointmentId);
      setCollectAmount(String(inv.remaining));
      setCollectMethod("CASH");
      setCollectOpen(true);
    } catch {
      toast("Impossible de préparer l’encaissement.", "error");
    }
  }

  async function handleCollect() {
    const appointmentId = collectAptId || collectBillable[0]?.id;
    if (!appointmentId) return;
    setSubmitting(true);
    const result = await createPayments({
      appointmentId,
      items: [{ amount: Number(collectAmount), method: collectMethod }],
      idempotencyKey: newIdempotencyKey("inv-pay"),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Paiement enregistré.", "success");
    setCollectOpen(false);
    await refresh();
  }

  async function handleVoid() {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      toast("Motif d’annulation requis.", "error");
      return;
    }
    setSubmitting(true);
    const result = await voidInvoice(voidTarget.id, { reason: voidReason.trim() });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setVoidTarget(null);
    setVoidReason("");
    toast("Facture annulée (VOID).", "success");
    await refresh();
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setPeriod("month");
    setMethod("");
    setStaff("");
    setTab("all");
  }

  const tabs: { id: InvoiceTab; label: string; count: number; dot?: string }[] = [
    { id: "all", label: "Toutes", count: counts.all },
    { id: "paid", label: "Payées", count: counts.paid, dot: "bg-emerald-500" },
    { id: "partial", label: "Partiellement payées", count: counts.partial, dot: "bg-amber-500" },
    { id: "unpaid", label: "Impayées / En attente", count: counts.unpaid, dot: "bg-rose-500" },
    { id: "void", label: "Annulées (VOID)", count: counts.voided },
  ];

  const evoHint =
    kpis?.evolutionPct == null
      ? kpis?.prevMonthBilled === 0
        ? "pas de mois précédent"
        : "évolution indisponible"
      : `${kpis.evolutionPct > 0 ? "+" : ""}${kpis.evolutionPct} % vs mois préc.`;

  return (
    <>
      <InvoicesMobile
        orgName={user.orgName}
        insight={insight}
        kpis={kpis}
        search={searchInput}
        onSearch={setSearchInput}
        tab={tab}
        onTab={setTab}
        tabCounts={counts}
        period={period}
        onPeriod={setPeriod}
        method={method}
        onMethod={(m) => setMethod(m as PaymentMethod | "")}
        canWrite={canWrite}
        canPayments={canPayments}
        canCustomers={canCustomers}
        loading={loading}
        rows={filtered}
        priority={priority}
        selected={selected}
        onSelect={setSelectedId}
        onNew={openCreate}
        onVoid={(e) => {
          setVoidTarget(e);
          setVoidReason("");
        }}
        onCollect={openCollect}
        exportCsv={() => exportInvoicesCsv(filtered)}
      />

      <div className="hidden space-y-4 lg:block">
        <section className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm lg:flex-row lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
              Finance · Facturation
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-semibold leading-9 tracking-tight">
                Factures & documents clients
              </h1>
              <span className="rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#261900]">
                {ROLE_LABEL[user.role]}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[13px] text-ink/55">
              Registre émis depuis le POS, les rendez-vous et les encaissements · {user.orgName}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportInvoicesCsv(filtered)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#F6E3EF] px-4 text-[14px] font-semibold"
            >
              <Download size={18} />
              Exporter CSV
            </button>
            {canWrite ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-[14px] font-semibold text-white shadow-sm"
              >
                <Plus size={18} />
                Nouvelle facture
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi
            label="CA facturé"
            value={formatMad(kpis?.billedTotal ?? 0)}
            hint={evoHint}
            icon={<Receipt size={20} className="text-primary" />}
          />
          <Kpi
            label="Encaissé / payé"
            value={formatMad(kpis?.paidTotal ?? 0)}
            hint={
              kpis?.recoveryPct == null
                ? "taux indisponible"
                : `${kpis.recoveryPct} % recouvrement`
            }
            icon={<Wallet size={20} className="text-emerald-600" />}
          />
          <Kpi
            label="Reste à recouvrer"
            value={formatMad(kpis?.unpaidTotal ?? 0)}
            hint={`${kpis?.unpaidCount ?? 0} facture${(kpis?.unpaidCount ?? 0) > 1 ? "s" : ""} ouverte${(kpis?.unpaidCount ?? 0) > 1 ? "s" : ""}`}
            icon={<TrendingUp size={20} className="text-amber-700" />}
            alert={(kpis?.unpaidTotal ?? 0) > 0}
          />
          <Kpi
            label="Volume émis"
            value={String(kpis?.monthCount ?? 0)}
            hint="Factures du mois (hors VOID)"
            icon={<FileText size={20} className="text-ink/70" />}
          />
          <Kpi
            label="Annulées (VOID)"
            value={formatMad(kpis?.voidMonthTotal ?? 0)}
            hint={`${kpis?.voidMonthCount ?? 0} ce mois`}
            icon={<Undo2 size={20} className="text-primary" />}
          />
          <Kpi
            label="Panier moyen"
            value={kpis?.avgBasket == null ? "—" : formatMad(kpis.avgBasket)}
            hint="Par facture du mois"
            icon={<Sparkles size={20} className="text-[#7B5900]" />}
          />
        </section>

        {priority.length > 0 ? (
          <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <Wallet size={18} />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold">Créances à recouvrer</h2>
                  <p className="text-[13px] text-ink/55">
                    {formatMad(priorityTotal)} restant · {priority.length}{" "}
                    {priority.length > 1 ? "factures" : "facture"} (max. 3, solde réel)
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {priority.map((inv) => {
                const wa = waMeLink(inv.customerPhone);
                return (
                  <div key={inv.id} className="flex flex-col justify-between rounded-xl bg-[#FFEFF8] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-extrabold text-primary">{inv.number}</p>
                        <h3 className="mt-0.5 truncate text-[14px] font-bold">{inv.customerName}</h3>
                        <p className="truncate text-[12px] text-ink/50">
                          {inv.firstItemName ?? INVOICE_STATUS_LABEL[inv.status]}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[16px] font-extrabold text-primary">{formatMad(inv.remaining)}</p>
                        <p className="text-[10px] font-bold uppercase text-[#BA1A1A]">
                          {inv.paidAmount <= 0.001 ? "Impayé" : "Solde"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {wa ? (
                        <a
                          href={`${wa}?text=${encodeURIComponent(reminderText(inv, user.orgName))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-white text-[12px] font-bold text-emerald-700 shadow-sm"
                        >
                          <MessageCircle size={14} />
                          Relance
                        </a>
                      ) : (
                        <span className="flex h-9 flex-1 items-center justify-center text-[11px] text-ink/40">
                          Pas de téléphone
                        </span>
                      )}
                      {canWrite && inv.appointmentId ? (
                        <button
                          type="button"
                          onClick={() => openCollect(inv)}
                          className="h-9 rounded-lg bg-primary px-3 text-[12px] font-bold text-white"
                        >
                          Encaisser
                        </button>
                      ) : canPayments ? (
                        <Link
                          href="/payments/"
                          className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[12px] font-bold text-white"
                        >
                          Paiements
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 items-center gap-2 lg:grid-cols-12">
            <div className="relative lg:col-span-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher N° facture, cliente, téléphone…"
                className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-10 pr-16 text-[13px] outline-none ring-primary/30 focus:bg-white focus:ring-2"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/40">
                ⌘K
              </span>
            </div>
            <div className="lg:col-span-2">
              <Select
                className="h-11"
                value={period}
                onChange={(e) => setPeriod(e.target.value as InvoicePeriod)}
              >
                <option value="month">{periodLabel("month")}</option>
                <option value="today">{periodLabel("today")}</option>
                <option value="all">{periodLabel("all")}</option>
              </Select>
            </div>
            <div className="lg:col-span-3">
              <Select
                className="h-11"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}
              >
                <option value="">Tous règlements</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select className="h-11" value={staff} onChange={(e) => setStaff(e.target.value)}>
                <option value="">Toute l’équipe</option>
                {operators.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold",
                  tab === t.id ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink hover:bg-[#F6E3EF]",
                )}
              >
                {t.dot ? <span className={cn("h-2 w-2 rounded-full", t.dot)} /> : null}
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-extrabold",
                    tab === t.id ? "bg-white/20" : "bg-white text-ink/60",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex h-9 items-center rounded-lg bg-[#FFEFF8] px-3 text-[12px] font-semibold text-ink/60"
            >
              Réinitialiser
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-7">
            <div className="flex items-center justify-between bg-[#FFEFF8] px-4 py-3">
              <div>
                <h2 className="text-[18px] font-semibold">Registre des factures</h2>
                <p className="text-[12px] text-ink/50">
                  {filtered.length} {filtered.length > 1 ? "lignes" : "ligne"} · {periodLabel(period)}
                </p>
              </div>
              <button
                type="button"
                title="Rafraîchir"
                onClick={() => refresh()}
                className="rounded-lg p-1.5 text-ink/50 hover:bg-white hover:text-ink"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {loading ? (
              <p className="p-8 text-center text-[13px] text-ink/50">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-[13px] text-ink/50">
                Aucune facture pour ces filtres. Elles sont créées à la clôture du RDV, au POS, ou via « Nouvelle facture ».
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#FCE9F4] text-[11px] font-bold uppercase tracking-wider text-ink/50">
                        <th className="px-3 py-2.5">N° & date</th>
                        <th className="px-3 py-2.5">Cliente</th>
                        <th className="px-3 py-2.5">Prestations</th>
                        <th className="px-3 py-2.5 text-right">TTC / réglé</th>
                        <th className="px-3 py-2.5 text-center">Statut</th>
                        <th className="px-3 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((inv) => {
                        const chip = invoiceStatusChip(inv.status);
                        const active = selected?.id === inv.id;
                        const wa = waMeLink(inv.customerPhone);
                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setSelectedId(inv.id)}
                            className={cn(
                              "cursor-pointer border-t border-transparent transition-colors",
                              inv.status === "VOID"
                                ? "bg-[#FFDAD6]/20"
                                : active
                                  ? "bg-[#FFD9DE]/40"
                                  : "hover:bg-[#FFEFF8]/70",
                            )}
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              <div
                                className={cn(
                                  "font-extrabold",
                                  inv.status === "VOID"
                                    ? "text-[#BA1A1A]"
                                    : active
                                      ? "text-primary"
                                      : "text-ink",
                                )}
                              >
                                {inv.number}
                              </div>
                              <div className="text-[11px] text-ink/50">
                                {formatInvoiceDate(invoiceWhen(inv))} · {formatInvoiceTime(invoiceWhen(inv))}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-semibold">{inv.customerName}</div>
                              <div className="text-[11px] text-ink/45">{inv.customerPhone ?? "—"}</div>
                            </td>
                            <td className="max-w-[160px] px-3 py-3">
                              <div className="truncate font-medium">{inv.firstItemName ?? "—"}</div>
                              <div className="truncate text-[11px] text-ink/45">
                                {inv.staffName ? `Praticienne : ${inv.staffName}` : "—"}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              <div className="font-extrabold">{formatMad(inv.total)}</div>
                              <div
                                className={cn(
                                  "text-[11px] font-medium",
                                  inv.remaining > 0 && inv.status !== "VOID"
                                    ? "text-amber-800"
                                    : "text-emerald-700",
                                )}
                              >
                                {inv.status === "VOID"
                                  ? "Annulée"
                                  : inv.remaining > 0
                                    ? `Reste : ${formatMad(inv.remaining)}`
                                    : `Réglé : ${formatMad(inv.paidAmount)}`}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
                                  chip.className,
                                )}
                              >
                                {chip.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                {wa && inv.remaining > 0 && inv.status !== "VOID" ? (
                                  <a
                                    href={`${wa}?text=${encodeURIComponent(reminderText(inv, user.orgName))}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Relance WhatsApp"
                                    className="rounded p-1 text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <MessageCircle size={16} />
                                  </a>
                                ) : null}
                                <Link
                                  href={`/invoices/${inv.id}/`}
                                  title="Fiche"
                                  className="rounded p-1 text-ink/50 hover:bg-white hover:text-primary"
                                >
                                  <FileText size={16} />
                                </Link>
                                {canWrite && inv.status !== "VOID" ? (
                                  <button
                                    type="button"
                                    title="Annuler"
                                    className="rounded p-1 text-ink/50 hover:bg-white hover:text-[#BA1A1A]"
                                    onClick={() => {
                                      setVoidTarget(inv);
                                      setVoidReason("");
                                    }}
                                  >
                                    <Ban size={16} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col items-center justify-between gap-2 bg-[#FFEFF8] px-3 py-2 text-[13px] text-ink/55 sm:flex-row">
                  <div>
                    Affichage de {(page - 1) * INVOICE_PAGE_SIZE + 1} à{" "}
                    {Math.min(page * INVOICE_PAGE_SIZE, filtered.length)} sur {filtered.length}
                  </div>
                  {pageCount > 1 ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 rounded bg-white px-2 disabled:opacity-40"
                      >
                        Précédent
                      </button>
                      <span className="px-2 text-[13px] font-semibold">
                        {page}/{pageCount}
                      </span>
                      <button
                        type="button"
                        disabled={page >= pageCount}
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        className="h-8 rounded bg-white px-2 disabled:opacity-40"
                      >
                        Suivant
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-3 lg:col-span-5">
            {selected ? (
              <InvoiceInspect
                list={selected}
                detail={detail}
                loading={detailLoading}
                orgName={user.orgName}
                canWrite={canWrite}
                canPayments={canPayments}
                canCustomers={canCustomers}
                onVoid={() => {
                  setVoidTarget(selected);
                  setVoidReason("");
                }}
                onCollect={() => openCollect(selected)}
                onPrint={() => {
                  if (!detail) return;
                  if (!printInvoiceHtml(detail)) toast("Popup bloquée — autorisez l’ouverture.", "error");
                }}
                onDownload={() => {
                  if (!detail) return;
                  downloadInvoiceHtml(detail);
                }}
              />
            ) : (
              <div className="rounded-xl bg-white p-6 text-[13px] text-ink/50 shadow-sm">
                Sélectionnez une facture pour inspecter le document.
              </div>
            )}
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-xl bg-ink p-5 text-[#FEECF7] shadow-sm lg:col-span-7">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#FFDEA4]">
              <Sparkles size={16} />
              Lecture du registre
            </div>
            <p className="mt-2 text-[16px] font-semibold leading-7">{insight}</p>
            {kpis && kpis.billedTotal > 0 && kpis.recoveryPct != null ? (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#FEECF7]/70">Recouvrement du mois</span>
                  <span className="font-bold">
                    {kpis.recoveryPct} % ({formatMad(kpis.paidTotal)} / {formatMad(kpis.billedTotal)})
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FCCA66] to-primary"
                    style={{ width: `${Math.min(100, kpis.recoveryPct)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-3 rounded-xl bg-white p-5 shadow-sm lg:col-span-5">
            <h3 className="text-[16px] font-bold">Chaîne de valeur</h3>
            <p className="text-[13px] text-ink/55">
              Chaque facture est émise depuis un rendez-vous ou le POS, puis réconciliée avec les paiements.
            </p>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                ["POS", canPos ? "/pos/" : null],
                ["Facture", null],
                ["Paiement", canPayments ? "/payments/" : null],
                ["Caisse", canCash ? "/cash-register/" : null],
                ["Audit", null],
              ].map(([label, href]) =>
                href ? (
                  <Link
                    key={label}
                    href={href}
                    className="rounded-lg bg-[#FFEFF8] p-2 text-[11px] font-bold hover:bg-[#FCE9F4]"
                  >
                    {label}
                  </Link>
                ) : (
                  <div key={label} className="rounded-lg bg-[#FCE9F4] p-2 text-[11px] font-bold">
                    {label}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </div>

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle facture">
        <div className="space-y-4 text-sm">
          <p className="text-ink/60">
            Une facture est émise à partir d’un rendez-vous (prix figés). Pas de saisie libre.
          </p>
          {billable.length === 0 ? (
            <p className="rounded-lg bg-[#FFEFF8] p-3 text-[13px] text-ink/60">
              Aucun rendez-vous récent avec solde. Les factures sont aussi créées à la clôture du RDV ou au POS.
            </p>
          ) : (
            <label className="block">
              <span className="mb-1.5 block font-medium">Rendez-vous</span>
              <Select value={createAptId} onChange={(e) => setCreateAptId(e.target.value)}>
                {billable.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.customerName} · {b.serviceName} · reste {formatPayMad(b.remaining)}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block font-medium">Note (optionnelle)</span>
            <Input value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} />
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !createAptId}
            onClick={handleCreate}
          >
            {submitting ? "Émission…" : "Émettre la facture"}
          </Button>
        </div>
      </Drawer>

      <Drawer open={collectOpen} onClose={() => setCollectOpen(false)} title="Encaisser le solde">
        <div className="space-y-4 text-sm">
          {collectBillable.length > 0 ? (
            <label className="block">
              <span className="mb-1.5 block font-medium">Rendez-vous</span>
              <Select
                value={collectAptId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCollectAptId(id);
                  const found = collectBillable.find((b) => b.id === id);
                  if (found) setCollectAmount(String(found.remaining));
                }}
              >
                {collectBillable.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.customerName} · reste {formatPayMad(b.remaining)}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block font-medium">Montant</span>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-medium">Méthode</span>
              <Select
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || collectBillable.length === 0}
            onClick={handleCollect}
          >
            {submitting ? "Encaissement…" : "Encaisser"}
          </Button>
        </div>
      </Drawer>

      <Drawer open={Boolean(voidTarget)} onClose={() => setVoidTarget(null)} title="Annuler la facture">
        {voidTarget ? (
          <div className="space-y-4 text-sm">
            <p className="text-ink/60">
              Passage en VOID — le document n’est pas supprimé et aucun avoir négatif n’est créé.
            </p>
            <p>
              {voidTarget.number} · {formatMad(voidTarget.total)} · {voidTarget.customerName}
            </p>
            <label className="block">
              <span className="mb-1.5 block font-medium">Motif</span>
              <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </label>
            <Button type="button" variant="primary" className="w-full" disabled={submitting} onClick={handleVoid}>
              Confirmer l’annulation
            </Button>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  alert,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl p-4 shadow-sm",
        alert ? "bg-amber-50" : "bg-white",
      )}
    >
      <div className={cn("flex items-center justify-between", alert ? "text-amber-800" : "text-ink/50")}>
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider">{label}</span>
        <span className="shrink-0">{icon}</span>
      </div>
      <div className="mt-2">
        <div className={cn("text-[22px] font-bold", alert && "text-amber-800")}>{value}</div>
        <div className={cn("mt-1 text-[11px]", alert ? "text-amber-800/80" : "text-ink/45")}>{hint}</div>
      </div>
    </div>
  );
}

function InvoiceInspect({
  list,
  detail,
  loading,
  orgName,
  canWrite,
  canPayments,
  canCustomers,
  onVoid,
  onCollect,
  onPrint,
  onDownload,
}: {
  list: InvoiceListItem;
  detail: InvoiceDetail | null;
  loading: boolean;
  orgName: string;
  canWrite: boolean;
  canPayments: boolean;
  canCustomers: boolean;
  onVoid: () => void;
  onCollect: () => void;
  onPrint: () => void;
  onDownload: () => void;
}) {
  const chip = invoiceStatusChip(list.status);
  const wa = waMeLink(list.customerPhone);
  const items = detail?.items ?? [];
  const ice = detail?.orgIceSnapshot;
  const paid = detail?.paidAmount ?? list.paidAmount;
  const remaining = detail?.remaining ?? list.remaining;
  const total = detail?.total ?? list.total;
  const subtotal = detail?.subtotal ?? list.subtotal;
  const discount = detail?.discountTotal ?? list.discountTotal;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              list.status === "PAID"
                ? "bg-emerald-500"
                : list.status === "VOID"
                  ? "bg-ink/30"
                  : "bg-amber-500",
            )}
          />
          <span className="text-[14px] font-bold">Inspection : {list.number}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDownload}
            disabled={!detail}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#FFEFF8] px-3 text-[12px] font-bold disabled:opacity-40"
          >
            <FileText size={14} className="text-primary" />
            HTML
          </button>
          <button
            type="button"
            onClick={onPrint}
            disabled={!detail}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#FFEFF8] px-3 text-[12px] font-bold disabled:opacity-40"
          >
            <Printer size={14} />
            Ticket
          </button>
          {wa ? (
            <a
              href={`${wa}?text=${encodeURIComponent(reminderText(list, orgName))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-50 px-3 text-[12px] font-bold text-emerald-800"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="space-y-1">
            <p className="text-[16px] font-extrabold tracking-tight">
              {detail?.orgNameSnapshot ?? orgName}
            </p>
            {detail?.orgAddressSnapshot ? (
              <p className="text-[11px] text-ink/50">{detail.orgAddressSnapshot}</p>
            ) : null}
            {ice ? <p className="text-[11px] text-ink/50">ICE {ice}</p> : null}
          </div>
          <div className="text-right">
            <span className="inline-block rounded bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-primary">
              FACTURE
            </span>
            <div className="mt-1 text-[18px] font-extrabold">{list.number}</div>
            <div className="text-[12px] text-ink/50">{formatInvoiceDateTime(invoiceWhen(list))}</div>
            {list.appointmentId ? (
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-ink/45">
                <Link2 size={12} />
                Liée au RDV
              </div>
            ) : (
              <div className="text-[11px] text-ink/45">Sans RDV lié</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">Cliente</span>
            <div className="mt-0.5 text-[14px] font-extrabold">{list.customerName}</div>
            <div className="text-[12px] text-ink/50">{list.customerPhone ?? "Téléphone non renseigné"}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">Praticienne</span>
            <div className="mt-0.5 text-[14px] font-bold">{list.staffName ?? "—"}</div>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {loading && items.length === 0 ? (
            <p className="text-[12px] text-ink/45">Chargement des lignes…</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg bg-[#FFEFF8]/60 p-2.5 text-[13px]">
              <span className="font-bold">{list.firstItemName ?? "Prestation"}</span>
            </div>
          ) : (
            items.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-lg bg-[#FFEFF8]/60 p-2.5 text-[13px]">
                <div className="min-w-0 pr-2">
                  <span className="block truncate font-bold">{i.nameSnapshot}</span>
                  <span className="text-[11px] text-ink/50">
                    Qté {i.quantity} · P.U. {formatMad(i.unitPriceSnapshot)}
                  </span>
                </div>
                <div className="shrink-0 font-extrabold">{formatMad(i.total)}</div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-56 space-y-1 text-[13px]">
            <div className="flex justify-between text-ink/50">
              <span>Sous-total</span>
              <span>{formatMad(subtotal)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-ink/50">
                <span>Remise</span>
                <span>−{formatMad(discount)}</span>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between rounded-lg bg-[#FCE9F4] p-2 font-bold">
              <span className="text-[13px]">Total TTC</span>
              <span className="text-[18px] font-extrabold text-primary">{formatMad(total)}</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center justify-between rounded-xl p-3",
            list.status === "PAID"
              ? "bg-emerald-50 text-emerald-950"
              : list.status === "VOID"
                ? "bg-[#F0DDE9] text-ink/70"
                : "bg-amber-50 text-amber-950",
          )}
        >
          <div>
            <span className="block text-[13px] font-extrabold">
              {list.status === "PAID"
                ? "Facture acquittée"
                : list.status === "VOID"
                  ? "Facture annulée (VOID)"
                  : remaining > 0
                    ? "Solde restant"
                    : INVOICE_STATUS_LABEL[list.status]}
            </span>
            <span className="text-[12px]">
              Payé {formatMad(paid)}
              {methodLabel(list.paymentMethods) !== "—"
                ? ` · ${methodLabel(list.paymentMethods)}`
                : ""}{" "}
              · Reste {formatMad(remaining)}
            </span>
          </div>
          <span className={cn("rounded px-2 py-1 text-[11px] font-bold", chip.className)}>{chip.label}</span>
        </div>

        {detail?.voidReason ? (
          <p className="mt-2 text-[12px] text-[#BA1A1A]">Motif : {detail.voidReason}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {canWrite && list.status !== "VOID" && remaining > 0 && list.appointmentId ? (
          <button
            type="button"
            onClick={onCollect}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-[14px] font-semibold text-white shadow-sm"
          >
            Encaisser {formatMad(remaining)}
          </button>
        ) : null}
        {canWrite && list.status !== "VOID" ? (
          <button
            type="button"
            onClick={onVoid}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#FFDAD6] px-4 text-[14px] font-semibold text-[#93000A]"
          >
            <Undo2 size={16} />
            Annuler (VOID)
          </button>
        ) : null}
        <Link
          href={`/invoices/${list.id}/`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-[14px] font-semibold shadow-sm"
        >
          Fiche complète
        </Link>
        {canPayments ? (
          <Link
            href="/payments/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-[14px] font-semibold shadow-sm"
          >
            Paiements
          </Link>
        ) : null}
        {canCustomers ? (
          <Link
            href={`/customers/${list.customerId}/`}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-4 text-[14px] font-semibold shadow-sm"
          >
            Fiche cliente
          </Link>
        ) : null}
      </div>
    </div>
  );
}
