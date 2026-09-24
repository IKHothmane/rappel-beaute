"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Hourglass,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { PurchaseDetailView } from "@/components/procurement/purchase-detail-view";
import { PurchaseFocusPanel } from "@/components/procurement/purchase-focus-panel";
import { PurchaseForm } from "@/components/procurement/purchase-form";
import {
  canReceiveStatus,
  formatPurchaseDate,
  purchaseInsight,
  purchaseStatusChip,
  purchaseSummaryLine,
} from "@/components/procurement/purchase-helpers";
import { PurchasesMobile, type PurchasesTab } from "@/components/procurement/purchases-mobile";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { listProducts } from "@/modules/inventory/service";
import {
  createPurchase,
  formatMad,
  listPurchases,
  listSuppliers,
  PURCHASE_STATUS_LABEL,
} from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type {
  PurchaseItemInput,
  PurchaseKpis,
  PurchaseListItem,
  PurchaseStatus,
  SupplierListItem,
} from "@/types/procurement";

export function PurchasesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const showExpenses = canAccessNav(user.role, "expenses");
  const showSuppliers = canAccessNav(user.role, "suppliers");

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PurchasesTab>("orders");
  const [status, setStatus] = useState<PurchaseStatus | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<PurchaseListItem[]>([]);
  const [kpis, setKpis] = useState<PurchaseKpis | null>(null);
  const [total, setTotal] = useState(0);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [catalog, setCatalog] = useState<ProductListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const common = {
        search,
        supplierId: supplierId || undefined,
        limit: 40,
      };
      if (tab === "receipts") {
        const [ordered, partial] = await Promise.all([
          listPurchases({ ...common, status: "ORDERED" }),
          listPurchases({ ...common, status: "PARTIALLY_RECEIVED" }),
        ]);
        const merged = [...ordered.data, ...partial.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRows(merged);
        setKpis(ordered.kpis);
        setTotal(ordered.kpis.awaitingReceiptCount);
      } else {
        const res = await listPurchases({
          ...common,
          status: status || undefined,
        });
        setRows(res.data);
        setKpis(res.kpis);
        setTotal(res.pagination.total);
      }
    } catch {
      toast("Impossible de charger les achats.", "error");
    }
  }, [search, status, supplierId, tab, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    Promise.all([
      listSuppliers({ active: true, limit: 100 }),
      listProducts({ active: true, limit: 100 }),
    ])
      .then(([s, p]) => {
        setSuppliers(s.data);
        setCatalog(p.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) {
      const firstOpen = rows.find((r) => canReceiveStatus(r.status));
      setSelectedId((firstOpen ?? rows[0]).id);
    }
  }, [rows, selectedId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const lowStockCount = catalog.filter((p) => p.alert === "LOW" || p.alert === "OUT").length;
  const insight = useMemo(() => purchaseInsight(kpis, lowStockCount), [kpis, lowStockCount]);

  function handleTab(next: PurchasesTab) {
    setTab(next);
    if (next === "receipts") setStatus("");
  }

  async function handleCreate(payload: {
    supplierId?: string;
    notes?: string;
    submit: boolean;
    items: PurchaseItemInput[];
  }) {
    if (payload.items.some((l) => !l.productId || l.quantityOrdered <= 0)) {
      toast("Ajoutez au moins une ligne produit valide.", "error");
      return;
    }
    setSubmitting(true);
    const result = await createPurchase(payload);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast(payload.submit ? "Commande envoyée." : "Brouillon enregistré.", "success");
    refresh();
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PurchasesMobile
        orgName={user.orgName}
        kpis={kpis}
        canWrite={canWrite}
        financeHidden={financeHidden}
        showExpenses={showExpenses}
        insight={insight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        tab={tab}
        onTab={handleTab}
        status={status}
        onStatus={setStatus}
        supplierId={supplierId}
        onSupplier={setSupplierId}
        suppliers={suppliers}
        rows={rows}
        total={total}
        loading={loading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selected={selected}
        onCreate={() => setDrawerOpen(true)}
        onReceived={() => void refresh()}
        onToast={toast}
        onOpenFull={() => setDetailOpen(true)}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
                <ShoppingCart size={26} className="text-primary" />
                Achats & approvisionnements
              </h1>
              <p className="mt-1 max-w-3xl text-[15px] text-ink/50">
                Cycle fournisseur → bon de commande → réception. Le stock n’augmente qu’au pointage.
              </p>
            </div>
            {canWrite ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md"
              >
                <Plus size={18} />
                Nouvelle commande
              </button>
            ) : null}
          </div>
        </section>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => handleTab("orders")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-semibold",
              tab === "orders" ? "bg-primary text-white shadow-sm" : "bg-[#FFEFF8] text-ink",
            )}
          >
            <ClipboardList size={16} />
            Commandes
            <span className={cn("rounded-full px-1.5 text-[11px] font-bold", tab === "orders" ? "bg-white text-primary" : "bg-white text-ink/55")}>
              {kpis?.purchaseCount ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTab("receipts")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-semibold",
              tab === "receipts" ? "bg-primary text-white shadow-sm" : "bg-[#FFEFF8] text-ink",
            )}
          >
            <PackageCheck size={16} />
            Réceptions
            <span className={cn("rounded-full px-1.5 text-[11px] font-bold", tab === "receipts" ? "bg-white text-primary" : "bg-white text-ink/55")}>
              {kpis?.awaitingReceiptCount ?? 0}
            </span>
          </button>
          {showExpenses ? (
            <Link
              href="/expenses/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFEFF8] px-4 py-2 text-[14px] font-semibold text-ink hover:bg-[#FCE9F4]"
            >
              <Wallet size={16} />
              Dépenses
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-white p-3.5 shadow-sm xl:flex-row xl:items-center">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par n° ou fournisseur…"
              className="h-10 w-full rounded-lg bg-[#FFEFF8] pl-9 pr-4 text-[13px] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {tab === "orders" ? (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseStatus | "")}
                className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-[13px]"
              >
                <option value="">Statut : Tous</option>
                <option value="DRAFT">Brouillon</option>
                <option value="ORDERED">Commandée</option>
                <option value="PARTIALLY_RECEIVED">Partiellement reçue</option>
                <option value="RECEIVED">Reçue</option>
                <option value="CANCELLED">Annulée</option>
              </select>
            ) : null}
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 rounded-lg bg-[#FFEFF8] px-3 text-[13px]"
            >
              <option value="">Fournisseur : Tous</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <KpiCard label="Total commandes" value={String(kpis?.purchaseCount ?? 0)} hint="Journal complet" icon={ShoppingCart} />
          <KpiCard label="Brouillons" value={String(kpis?.draftCount ?? 0)} hint="Pas encore envoyés" icon={Hourglass} />
          <KpiCard label="Commandées" value={String(kpis?.orderedCount ?? 0)} hint="Chez le fournisseur" icon={Truck} tone="primary" />
          <KpiCard label="Reçues" value={String(kpis?.receivedCount ?? 0)} hint="Stock incrémenté" icon={CheckCircle2} />
          <KpiCard
            label="Achats ce mois"
            value={financeHidden ? "—" : formatMad(kpis?.monthTotal ?? 0)}
            hint="Hors commandes annulées"
            icon={Wallet}
          />
          <KpiCard
            label="À réceptionner"
            value={String(kpis?.awaitingReceiptCount ?? 0)}
            hint="Commandées ou partielles"
            icon={PackageCheck}
            alert={(kpis?.awaitingReceiptCount ?? 0) > 0}
          />
        </section>

        <div className="relative overflow-hidden rounded-2xl bg-ink p-5 text-[#FEECF7] shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FFDEA4]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFDEA4]">Lecture du journal</p>
              <p className="mt-1.5 text-[14px] leading-relaxed">{insight}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-[18px] font-semibold text-ink">Journal des commandes</h2>
                <span className="rounded-full bg-[#F6E3EF] px-2.5 py-0.5 text-[11px] font-semibold text-ink/55">
                  {total} bon{total > 1 ? "s" : ""}
                </span>
              </div>
              {loading ? (
                <p className="p-8 text-center text-sm text-ink/40">Chargement…</p>
              ) : rows.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink/40">Aucune commande.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/45">
                      <tr>
                        <th className="px-4 py-3">N°</th>
                        <th className="px-4 py-3">Fournisseur</th>
                        <th className="px-4 py-3">Dates</th>
                        <th className="px-4 py-3">Lignes</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Statut</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => (
                        <tr
                          key={p.id}
                          className={cn(
                            "cursor-pointer border-t border-[#F0DDE9]/60 transition-colors",
                            p.id === selectedId ? "bg-[#FFEFF8]/80" : "hover:bg-[#FFEFF8]/40",
                            p.status === "PARTIALLY_RECEIVED" && "bg-[#FFDEA4]/10",
                          )}
                          onClick={() => setSelectedId(p.id)}
                        >
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px] font-bold text-ink">
                            {p.number}
                          </td>
                          <td className="px-4 py-3.5">
                            {showSuppliers && p.supplierId ? (
                              <Link
                                href={`/suppliers/${p.supplierId}/`}
                                className="font-semibold text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {p.supplierName}
                              </Link>
                            ) : (
                              <span className="font-semibold">{p.supplierName}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-ink/50">
                            <div>Émise {formatPurchaseDate(p.createdAt)}</div>
                            {p.receivedAt ? (
                              <div className="font-semibold text-ink">Reçue {formatPurchaseDate(p.receivedAt)}</div>
                            ) : p.orderedAt ? (
                              <div className="font-semibold text-ink">Commandée {formatPurchaseDate(p.orderedAt)}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 text-ink/55">{purchaseSummaryLine(p)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold">
                            {financeHidden ? "—" : formatMad(p.total)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", purchaseStatusChip(p.status))}>
                              {PURCHASE_STATUS_LABEL[p.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-1">
                              {canWrite && canReceiveStatus(p.status) ? (
                                <button
                                  type="button"
                                  className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(p.id);
                                  }}
                                >
                                  Réceptionner
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="rounded-md bg-[#F6E3EF] px-2.5 py-1 text-[11px] font-semibold text-ink"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(p.id);
                                    setDetailOpen(true);
                                  }}
                                >
                                  Détail
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 text-[12px] text-ink/45 shadow-sm">
              <span className="font-bold text-ink">Chaîne :</span>
              {showSuppliers ? (
                <Link href="/suppliers/" className="hover:text-primary">
                  Fournisseurs
                </Link>
              ) : (
                <span>Fournisseurs</span>
              )}
              <span>→</span>
              <span className="font-semibold text-primary">Achats</span>
              <span>→</span>
              <Link href="/stock/" className="hover:text-primary">
                Stock
              </Link>
              <span>→</span>
              <Link href="/products/" className="hover:text-primary">
                Produits
              </Link>
              {showExpenses ? (
                <>
                  <span>→</span>
                  <Link href="/expenses/" className="hover:text-primary">
                    Dépenses
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-4">
            {selected ? (
              <PurchaseFocusPanel
                purchaseId={selected.id}
                fallback={selected}
                canWrite={canWrite}
                financeHidden={financeHidden}
                onReceived={() => void refresh()}
                onToast={toast}
                onOpenFull={() => setDetailOpen(true)}
              />
            ) : (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/40 shadow-sm">
                Sélectionnez une commande.
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selected ? selected.number : "Fiche commande"}
        className="max-w-xl"
      >
        {selected ? (
          <PurchaseDetailView
            key={selected.id}
            purchaseId={selected.id}
            embedded
            onChanged={() => void refresh()}
          />
        ) : null}
      </Drawer>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle commande">
        <PurchaseForm
          key={drawerOpen ? "open" : "closed"}
          suppliers={suppliers}
          catalog={catalog}
          submitting={submitting}
          onSubmit={(payload) => void handleCreate(payload)}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  alert,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ShoppingCart;
  tone?: "primary";
  alert?: boolean;
}) {
  return (
    <div className={cn("flex flex-col justify-between rounded-xl p-4 shadow-sm", alert ? "bg-[#FFDAD6]/50" : "bg-white")}>
      <div className="flex items-center justify-between text-ink/45">
        <span className={cn("text-[11px] font-bold uppercase tracking-wider", alert && "text-[#BA1A1A]")}>{label}</span>
        <Icon size={16} className={alert ? "text-[#BA1A1A]" : "text-primary"} />
      </div>
      <div className="mt-2">
        <p className={cn("text-[28px] font-extrabold leading-none text-ink", alert && "text-[#BA1A1A]")}>{value}</p>
        <p className={cn("mt-1 text-[12px] text-ink/45", tone === "primary" && "font-semibold text-primary")}>{hint}</p>
      </div>
    </div>
  );
}
