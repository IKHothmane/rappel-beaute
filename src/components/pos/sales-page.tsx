"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteCashRegister } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatMad, PAYMENT_METHOD_LABEL } from "@/modules/finance/service";
import {
  listPosSalesApi,
  refundPosSaleApi,
  type PosSaleDetail,
  type PosSalesKpis,
} from "@/modules/pos/service";
import {
  POS_SALE_STATUS_LABEL,
  type PosSaleStatus,
} from "@/types/pos";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types/finance";

type Period = "today" | "week" | "month" | "custom";

function periodRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (period === "today") {
    /* same day */
  } else if (period === "week") {
    from.setDate(from.getDate() - 6);
  } else if (period === "month") {
    from.setDate(1);
  }
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function formatSaleTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-MA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SalesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCashRegister(user.role);
  const canPos = canAccessNav(user.role, "ventes") || canAccessNav(user.role, "pos");

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState(() => periodRange("today").from);
  const [to, setTo] = useState(() => periodRange("today").to);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [status, setStatus] = useState<PosSaleStatus | "all">("all");
  const [rows, setRows] = useState<PosSaleDetail[]>([]);
  const [kpis, setKpis] = useState<PosSalesKpis>({
    revenue: 0,
    salesCount: 0,
    productsSold: 0,
    averageBasket: 0,
  });
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (period === "custom") return;
    const r = periodRange(period);
    setFrom(r.from);
    setTo(r.to);
  }, [period]);

  const load = useCallback(async () => {
    try {
      const res = await listPosSalesApi({
        from,
        to,
        search: searchDebounced || undefined,
        paymentMethod: method || undefined,
        status,
        limit: 100,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les ventes.", "error");
    }
  }, [from, to, searchDebounced, method, status, toast]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const completedCount = useMemo(
    () => rows.filter((r) => r.status === "COMPLETED").length,
    [rows],
  );

  async function onRefund(sale: PosSaleDetail) {
    if (!canWrite || sale.status !== "COMPLETED") return;
    if (!window.confirm(`Rembourser la vente ${sale.invoiceNumber} ?`)) return;
    setRefundingId(sale.id);
    const result = await refundPosSaleApi(sale.id);
    setRefundingId(null);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`Vente ${sale.invoiceNumber} remboursée.`, "success");
    await load();
  }

  if (!canPos) {
    return (
      <div className="p-8 text-center text-sm text-ink/55">
        Accès non autorisé aux ventes produits.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Ventes &amp; Finance
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Ventes produits</h1>
          <p className="mt-1 text-sm text-ink/55">
            Historique des ventes POS, statistiques et tickets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => load()} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Link
            href="/pos/"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <ShoppingBag className="h-4 w-4" />
            Ouvrir le POS
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "CA produits", value: formatMad(kpis.revenue) },
          { label: "Nombre de ventes", value: String(kpis.salesCount) },
          { label: "Produits vendus", value: String(Math.round(kpis.productsSold)) },
          { label: "Panier moyen", value: formatMad(kpis.averageBasket) },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{kpi.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink">
          Période
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-10 min-w-[140px]"
          >
            <option value="today">Aujourd&apos;hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="custom">Personnalisée</option>
          </Select>
        </label>
        {period === "custom" ? (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink">
              Du
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink">
              Au
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
            </label>
          </>
        ) : null}
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-medium text-ink">
          Recherche
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="N° facture, cliente…"
              className="h-10 pl-9"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink">
          Paiement
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}
            className="h-10 min-w-[140px]"
          >
            <option value="">Tous</option>
            {PAYMENT_METHODS.filter((m) => m !== "ONLINE").map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink">
          Statut
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as PosSaleStatus | "all")}
            className="h-10 min-w-[140px]"
          >
            <option value="all">Tous</option>
            <option value="COMPLETED">Encaissée</option>
            <option value="REFUNDED">Remboursée</option>
            <option value="CANCELLED">Annulée</option>
          </Select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardList className="h-4 w-4 text-primary" />
            Ventes récentes
          </div>
          <span className="text-xs text-ink/45">
            {rows.length} affichée{rows.length > 1 ? "s" : ""} · {completedCount} encaissée
            {completedCount > 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-ink/45">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink/45">Aucune vente sur cette période.</p>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((sale) => {
              const qty = sale.lines.reduce((acc, l) => acc + l.quantity, 0);
              return (
                <div
                  key={sale.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{sale.invoiceNumber}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          sale.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : sale.status === "REFUNDED"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-ink/5 text-ink/50",
                        )}
                      >
                        {POS_SALE_STATUS_LABEL[sale.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink/60">
                      {sale.customerName ?? "Cliente comptoir"} · {Math.round(qty)} produit
                      {qty > 1 ? "s" : ""} · {PAYMENT_METHOD_LABEL[sale.paymentMethod]}
                    </p>
                    <p className="text-xs text-ink/40">{formatSaleTime(sale.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-ink">{formatMad(sale.total)}</span>
                    <Link
                      href={`/invoices/${sale.invoiceId}/`}
                      className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink transition hover:bg-primary-light/40"
                    >
                      Voir ticket
                    </Link>
                    {canWrite && sale.status === "COMPLETED" ? (
                      <button
                        type="button"
                        disabled={refundingId === sale.id}
                        onClick={() => onRefund(sale)}
                        className="inline-flex h-9 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
                      >
                        {refundingId === sale.id ? "…" : "Retourner"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
