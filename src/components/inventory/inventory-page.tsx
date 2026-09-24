"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  History,
  Minus,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { InventoryAccordion, InventoryMobile, type StockTab, type UsageFilter } from "@/components/inventory/inventory-mobile";
import {
  alertBarClass,
  alertChipClass,
  exportProductsCsv,
  formatMovementTime,
  STOCK_ALERT_LABEL,
  stockFillPercent,
  usageLabel,
} from "@/components/inventory/product-helpers";
import { indexLatestMovement, movementQtyLabel, movementTone, stockInsight } from "@/components/inventory/stock-helpers";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  applyInventoryCount,
  createMovement,
  formatMad,
  formatQty,
  getStockKpis,
  listMovements,
  listProducts,
  MOVEMENT_TYPE_LABEL,
} from "@/modules/inventory/service";
import { listPurchases } from "@/modules/procurement/service";
import type {
  InventoryMovementItem,
  MovementType,
  ProductCategory,
  ProductListItem,
  StockAlertLevel,
  StockKpis,
} from "@/types/inventory";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

export function InventoryPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const showPurchases = canAccessNav(user.role, "purchases");

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StockTab>("niveaux");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [alert, setAlert] = useState<StockAlertLevel | "">("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [kpis, setKpis] = useState<StockKpis | null>(null);
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [movementTotal, setMovementTotal] = useState(0);
  const [openOrders, setOpenOrders] = useState(0);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [blOpen, setBlOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<MovementType>("ADJUSTMENT_IN");
  const [adjustProductId, setAdjustProductId] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [mov, prods, k] = await Promise.all([
        listMovements({ limit: 100 }),
        listProducts({ limit: 100, active: true }),
        getStockKpis(),
      ]);
      setMovements(mov.data);
      setMovementTotal(mov.pagination.total);
      setProducts(prods.data);
      setKpis(k);
      const init: Record<string, string> = {};
      for (const p of prods.data) init[p.id] = String(p.stock);
      setCounts(init);
      if (showPurchases) {
        listPurchases({ limit: 1 })
          .then((r) => setOpenOrders(r.kpis.awaitingReceiptCount + r.kpis.orderedCount))
          .catch(() => setOpenOrders(0));
      }
    } catch {
      toast("Impossible de charger le stock.", "error");
    }
  }, [toast, showPurchases]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const selected = products.find((p) => p.id === selectedId) ?? products[0] ?? null;
  const latestByProduct = useMemo(() => indexLatestMovement(movements), [movements]);
  const insight = useMemo(() => stockInsight(movements), [movements]);
  const sellableCount = products.filter((p) => p.sellable).length;
  const cabineCount = products.filter((p) => p.consumable && !p.sellable).length;
  const optimalCount = products.filter((p) => p.active && p.alert === "OK").length;
  const inCount = movements.filter((m) => m.quantity > 0).length;
  const outCount = movements.filter((m) => m.quantity < 0).length;
  const careCount = movements.filter((m) => m.type === "SERVICE_CONSUMPTION").length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const alertFilter: StockAlertLevel | "" =
      tab === "alertes" && !alert ? ("OUT" as const) : alert;
    const alertSet: StockAlertLevel[] | null =
      tab === "alertes" && !alert ? ["LOW", "OUT", "EXPIRING", "EXPIRED"] : alertFilter ? [alertFilter] : null;
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (alertSet && !alertSet.includes(p.alert)) return false;
      if (usage === "sellable" && !p.sellable) return false;
      if (usage === "consumable" && !p.consumable) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.supplierName ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, category, alert, usage, tab]);

  function openAdjust(id?: string, type: MovementType = "ADJUSTMENT_IN") {
    setAdjustProductId(id ?? "");
    if (id) setSelectedId(id);
    setAdjustType(type);
    setAdjustOpen(true);
  }

  async function handleInventory() {
    setSubmitting(true);
    const items = products
      .map((p) => ({ productId: p.id, countedQuantity: Number(counts[p.id]) }))
      .filter((i) => !Number.isNaN(i.countedQuantity));
    const result = await applyInventoryCount(items);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`${result.adjustments} ajustement(s) créé(s).`, "success");
    refresh();
  }

  async function submitMovement(input: { type: MovementType; quantity: number; reason?: string; productId?: string }) {
    const productId = input.productId ?? selected?.id;
    if (!productId) {
      toast("Sélectionnez d’abord un produit.", "info");
      return;
    }
    setSubmitting(true);
    const result = await createMovement({
      productId,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      referenceType: input.type === "PURCHASE" ? "PURCHASE" : "MANUAL",
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setAdjustOpen(false);
    setReceiptOpen(false);
    setBlOpen(false);
    toast("Mouvement enregistré.", "success");
    refresh();
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <InventoryMobile
        orgName={user.orgName}
        catalogCount={products.length}
        kpis={kpis}
        optimalCount={optimalCount}
        openOrders={openOrders}
        canWrite={canWrite}
        financeHidden={financeHidden}
        insight={insight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        category={category}
        onCategory={setCategory}
        alert={alert}
        onAlert={setAlert}
        usage={usage}
        onUsage={setUsage}
        tab={tab}
        onTab={(t) => {
          setTab(t);
          if (t === "inventaire") setInvOpen(true);
        }}
        filtered={filtered}
        movements={movements}
        movementTotal={movementTotal}
        loading={loading}
        latestByProduct={latestByProduct}
        onQuickIn={(id) => openAdjust(id, "ADJUSTMENT_IN")}
        onQuickOut={(id) => openAdjust(id, "ADJUSTMENT_OUT")}
        onAdjust={(id) => openAdjust(id)}
        onReceipt={() => setBlOpen(true)}
        onInventory={() => {
          setTab("inventaire");
          setInvOpen(true);
        }}
        showPurchases={showPurchases}
      />

      {canWrite ? (
        <>
          <InventoryAccordion
            title="Réception rapide BL"
            hint="Entrée fournisseur via un mouvement Achat"
            open={blOpen}
            onToggle={() => setBlOpen((v) => !v)}
          >
            <ReceiptForm
              products={products}
              defaultId={selected?.id ?? ""}
              submitting={submitting}
              onSubmit={async (input) => {
                setSelectedId(input.productId);
                await submitMovement({
                  type: "PURCHASE",
                  quantity: input.quantity,
                  reason: input.reason,
                  productId: input.productId,
                });
              }}
            />
          </InventoryAccordion>
          <InventoryAccordion
            title="Contrôle d’inventaire"
            hint="Écarts → mouvements d’ajustement"
            open={invOpen || tab === "inventaire"}
            onToggle={() => setInvOpen((v) => !v)}
          >
            <InventoryCountForm
              products={products.slice(0, 12)}
              counts={counts}
              onChange={setCounts}
              canWrite={canWrite}
              submitting={submitting}
              onSubmit={handleInventory}
              compact
            />
          </InventoryAccordion>
        </>
      ) : null}

      <div className="hidden flex-col gap-5 lg:flex">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[28px] font-bold tracking-tight text-ink lg:text-[32px]">
                  Stock & mouvements
                </h1>
                <span className="rounded-full bg-[#FFF7E7] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#8C6510]">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-[14px] text-ink/50">
                Quantités réelles, décomptes liés aux soins clôturés, réceptions fournisseurs et inventaire
                physique. Le stock affiché est un cache recalculé à partir des mouvements.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => openAdjust()}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink shadow-sm ring-1 ring-black/5"
                >
                  <SlidersHorizontal size={16} className="text-[#C79A3B]" />
                  Ajustement
                </button>
              ) : null}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => setReceiptOpen(true)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#FFF7F9] px-3.5 text-[13px] font-semibold text-ink shadow-sm ring-1 ring-black/5"
                >
                  <Truck size={16} className="text-primary" />
                  Entrée BL
                </button>
              ) : null}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => setTab("inventaire")}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-white shadow-md"
                >
                  <Package size={16} />
                  Inventaire
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Références"
            value={String(kpis?.activeCount ?? products.length)}
            hint={`${sellableCount} revente · ${cabineCount} cabine`}
            icon={<Package size={16} />}
          />
          <KpiCard
            label="Stock normal"
            value={String(optimalCount)}
            hint={products.length ? `${((optimalCount / products.length) * 100).toFixed(0)} % conforme` : "—"}
            icon={<Package size={16} />}
            tone="emerald"
          />
          <KpiCard
            label="Stock bas"
            value={String(kpis?.lowStockCount ?? 0)}
            hint="Sous le seuil min"
            icon={<Package size={16} />}
            tone="warn"
            onClick={() => {
              setTab("niveaux");
              setAlert(alert === "LOW" ? "" : "LOW");
            }}
          />
          <KpiCard
            label="Ruptures"
            value={String(kpis?.outOfStockCount ?? 0)}
            hint="À commander"
            icon={<Package size={16} />}
            tone="error"
            onClick={() => {
              setTab("niveaux");
              setAlert(alert === "OUT" ? "" : "OUT");
            }}
          />
          {!financeHidden ? (
            <KpiCard
              label="Valeur stock"
              value={kpis ? formatMad(kpis.totalStockValue) : "—"}
              hint="Prix d’achat × quantité"
              icon={<Wallet size={16} />}
              tone="gold"
            />
          ) : (
            <KpiCard label="Lots" value={String(kpis?.expiringSoonCount ?? 0)} hint="Expirent sous 30 j" icon={<History size={16} />} />
          )}
          <KpiCard
            label="Flux"
            value={String(movementTotal)}
            hint={`${inCount} in · ${outCount} out${careCount ? ` · ${careCount} soins` : ""} (100 derniers)`}
            icon={<History size={16} />}
            onClick={() => setTab("mouvements")}
          />
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-[#FFF3F6] to-[#FFF9EE] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <Sparkles size={22} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Journal des mouvements</p>
                <h2 className="mt-0.5 text-[17px] font-bold text-ink">Décompte cabine et caisse sur les mouvements réels</h2>
                <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink/60">{insight}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Link
                href="/products/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#221820] px-4 text-[13px] font-bold text-white"
              >
                Catalogue produits
              </Link>
              {showPurchases && openOrders > 0 ? (
                <Link
                  href="/purchases/"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[12px] font-bold text-ink shadow-sm"
                >
                  {openOrders > 1 ? `${openOrders} commandes en attente` : `${openOrders} commande en attente`}
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabBtn active={tab === "niveaux"} onClick={() => setTab("niveaux")} icon={<Package size={16} />}>
            Niveaux de stock ({products.length})
          </TabBtn>
          <TabBtn active={tab === "mouvements"} onClick={() => setTab("mouvements")} icon={<History size={16} />}>
            Journal ({movementTotal})
          </TabBtn>
          <TabBtn active={tab === "inventaire"} onClick={() => setTab("inventaire")} icon={<SlidersHorizontal size={16} />}>
            Inventaire
          </TabBtn>
          <TabBtn active={tab === "alertes"} onClick={() => setTab("alertes")} icon={<Package size={16} />} danger>
            Alertes ({(kpis?.outOfStockCount ?? 0) + (kpis?.lowStockCount ?? 0)})
          </TabBtn>
        </div>

        {tab !== "inventaire" && tab !== "mouvements" ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-3.5 shadow-sm lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher référence, SKU, désignation… (⌘K)"
                className="h-11 w-full rounded-xl bg-[#FFF7F9] pl-11 pr-14 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#F0E3E6] bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink/40">
                ⌘K
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory | "")}
                className="h-11 rounded-xl bg-[#FFF7F9] px-3 text-[12px] font-semibold text-ink outline-none"
              >
                <option value="">Toutes catégories</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {PRODUCT_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
              <select
                value={alert}
                onChange={(e) => setAlert(e.target.value as StockAlertLevel | "")}
                className="h-11 rounded-xl bg-[#FFF7F9] px-3 text-[12px] font-semibold text-ink outline-none"
              >
                <option value="">État : tous</option>
                <option value="OK">Normal</option>
                <option value="LOW">Stock faible</option>
                <option value="OUT">Rupture</option>
                <option value="EXPIRING">Expire bientôt</option>
                <option value="EXPIRED">Expiré</option>
              </select>
              <select
                value={usage}
                onChange={(e) => setUsage(e.target.value as UsageFilter)}
                className="h-11 rounded-xl bg-[#FFF7F9] px-3 text-[12px] font-semibold text-ink outline-none"
              >
                <option value="all">Type : tous</option>
                <option value="sellable">Revente</option>
                <option value="consumable">Consommable cabine</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm xl:col-span-8">
            {tab === "mouvements" ? (
              <MovementTable movements={movements} loading={loading} total={movementTotal} />
            ) : tab === "inventaire" ? (
              <div className="p-5">
                <h3 className="text-[16px] font-bold text-ink">Inventaire physique</h3>
                <p className="mt-1 mb-4 text-[13px] text-ink/50">
                  Saisissez le stock réel. Les écarts créent des mouvements ADJUSTMENT — l’historique reste intact.
                </p>
                <InventoryCountForm
                  products={products}
                  counts={counts}
                  onChange={setCounts}
                  canWrite={canWrite}
                  submitting={submitting}
                  onSubmit={handleInventory}
                />
              </div>
            ) : (
              <StockTable
                rows={filtered}
                loading={loading}
                total={products.length}
                latestByProduct={latestByProduct}
                financeHidden={financeHidden}
                canWrite={canWrite}
                showPurchases={showPurchases}
                onExport={() => exportProductsCsv(filtered)}
                onIn={(id) => openAdjust(id, "ADJUSTMENT_IN")}
                onOut={(id) => openAdjust(id, "ADJUSTMENT_OUT")}
                onAdjust={(id) => openAdjust(id)}
              />
            )}
          </section>

          <aside className="flex flex-col gap-5 xl:sticky xl:top-20 xl:col-span-4">
            {canWrite ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2.5 border-b border-[#F0E3E6] pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0F4] text-primary">
                    <Truck size={18} />
                  </span>
                  <h3 className="text-[16px] font-bold text-ink">Réception rapide BL</h3>
                </div>
                <ReceiptForm
                  products={products}
                  defaultId={selected?.id ?? ""}
                  submitting={submitting}
                  onSubmit={async (input) => {
                    setSelectedId(input.productId);
                    await submitMovement({
                      type: "PURCHASE",
                      quantity: input.quantity,
                      reason: input.reason,
                      productId: input.productId,
                    });
                  }}
                />
              </div>
            ) : null}

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-[#F0E3E6] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0F4] text-primary">
                    <History size={18} />
                  </span>
                  <h3 className="text-[16px] font-bold text-ink">Flux récents</h3>
                </div>
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <FluxList movements={movements.slice(0, 6)} />
            </div>
          </aside>
        </div>
      </div>

      <Drawer
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Ajuster le stock"
      >
        <AdjustForm
          products={products}
          defaultId={adjustProductId}
          defaultType={adjustType}
          submitting={submitting}
          onCancel={() => setAdjustOpen(false)}
          onSubmit={(input) => {
            setSelectedId(input.productId);
            setAdjustProductId(input.productId);
            return submitMovement(input);
          }}
        />
      </Drawer>

      <Drawer open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Entrée BL">
        <ReceiptForm
          products={products}
          defaultId={selected?.id ?? ""}
          submitting={submitting}
          onSubmit={async (input) => {
            setSelectedId(input.productId);
            await submitMovement({
              type: "PURCHASE",
              quantity: input.quantity,
              reason: input.reason,
              productId: input.productId,
            });
          }}
        />
      </Drawer>
    </div>
  );
}

function StockTable({
  rows,
  loading,
  total,
  latestByProduct,
  financeHidden,
  canWrite,
  showPurchases,
  onExport,
  onIn,
  onOut,
  onAdjust,
}: {
  rows: ProductListItem[];
  loading: boolean;
  total: number;
  latestByProduct: Map<string, InventoryMovementItem>;
  financeHidden: boolean;
  canWrite: boolean;
  showPurchases: boolean;
  onExport: () => void;
  onIn: (id: string) => void;
  onOut: (id: string) => void;
  onAdjust: (id: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between bg-[#FFF7F9]/80 px-5 py-3.5">
        <div>
          <h3 className="text-[16px] font-bold text-ink">Références en stock</h3>
          <p className="text-[12px] text-ink/45">
            {rows.length} affichée{rows.length > 1 ? "s" : ""} sur {total}
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-ink/50 shadow-sm"
          title="Exporter CSV"
        >
          <Download size={16} />
        </button>
      </div>
      {loading ? (
        <p className="p-8 text-center text-sm text-ink/40">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-ink/45">Aucune référence.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#F0E3E6] bg-[#FFF7F9] text-[11px] font-bold uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3">Produit & SKU</th>
                <th className="px-3 py-3">Usage</th>
                <th className="px-3 py-3 text-center">Stock</th>
                <th className="px-3 py-3 text-center">Seuils</th>
                <th className="px-3 py-3">Statut</th>
                {!financeHidden ? <th className="px-3 py-3 text-right">Achat / Valeur</th> : null}
                <th className="px-3 py-3">Dernier mouvement</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E3E6]/80">
              {rows.map((p) => {
                const last = latestByProduct.get(p.id);
                const fill = stockFillPercent(p);
                return (
                  <tr
                    key={p.id}
                    className={cn("transition-colors hover:bg-[#FFF7F9]", (p.alert === "OUT" || p.alert === "EXPIRED") && "bg-red-50/30")}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-primary">
                          <Package size={18} />
                        </span>
                        <div className="min-w-0">
                          <Link href={`/products/${p.id}/`} className="truncate text-[13px] font-bold text-ink hover:text-primary">
                            {p.name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-ink/40">{p.sku}</span>
                            <span className="rounded bg-[#FCE9F4] px-1.5 py-0.5 text-[10px] font-bold text-ink/55">
                              {PRODUCT_CATEGORY_LABEL[p.category]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-ink/55">{usageLabel(p)}</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn("text-[15px] font-black", p.alert === "OUT" ? "text-primary" : p.alert === "LOW" ? "text-[#B67B00]" : "text-ink")}>
                        {p.stock}
                      </span>
                      <span className="ml-1 text-[10px] text-ink/40">{formatQty(p.stock, p.unit).split(" ").slice(1).join(" ")}</span>
                      <div className="mx-auto mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-[#F0DDE9]">
                        <div className={cn("h-full rounded-full", alertBarClass(p.alert))} style={{ width: `${fill}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center text-[11px] text-ink/50">
                      Min {p.minStock}
                      <br />
                      <span className="text-[10px] text-ink/35">{p.maxStock != null ? `Max ${p.maxStock}` : "—"}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", alertChipClass(p.alert))}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {STOCK_ALERT_LABEL[p.alert]}
                      </span>
                    </td>
                    {!financeHidden ? (
                      <td className="px-3 py-3.5 text-right">
                        <span className="block text-[13px] font-bold text-ink">{formatMad(p.purchasePrice)}</span>
                        <span className="text-[10px] text-ink/40">Total {formatMad(p.stockValue)}</span>
                      </td>
                    ) : null}
                    <td className="px-3 py-3.5">
                      {last ? (
                        <>
                          <span className="block text-[11px] font-bold text-ink">{MOVEMENT_TYPE_LABEL[last.type]}</span>
                          <span className="text-[10px] text-ink/40">{formatMovementTime(last.createdAt)}</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-ink/35">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {canWrite && p.alert === "OUT" && showPurchases ? (
                        <Link
                          href="/purchases/"
                          className="inline-flex items-center rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
                        >
                          Commander
                        </Link>
                      ) : canWrite ? (
                        <div className="inline-flex items-center gap-1">
                          <IconBtn label="Entrée" onClick={() => onIn(p.id)}>
                            <Plus size={14} />
                          </IconBtn>
                          <IconBtn label="Sortie" onClick={() => onOut(p.id)}>
                            <Minus size={14} />
                          </IconBtn>
                          <IconBtn label="Ajuster" onClick={() => onAdjust(p.id)}>
                            <SlidersHorizontal size={14} />
                          </IconBtn>
                        </div>
                      ) : (
                        <Link href={`/products/${p.id}/`} className="text-[11px] font-semibold text-primary">
                          Fiche
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MovementTable({
  movements,
  loading,
  total,
}: {
  movements: InventoryMovementItem[];
  loading: boolean;
  total: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between bg-[#FFF7F9]/80 px-5 py-3.5">
        <h3 className="text-[16px] font-bold text-ink">Journal des mouvements</h3>
        <span className="text-[12px] text-ink/45">{total} au total</span>
      </div>
      {loading ? (
        <p className="p-8 text-center text-sm text-ink/40">Chargement…</p>
      ) : movements.length === 0 ? (
        <p className="p-8 text-center text-sm text-ink/45">Aucun mouvement.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F0E3E6] bg-[#FFF7F9] text-[11px] font-bold uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3">Date</th>
                <th className="px-3 py-3">Produit</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Quantité</th>
                <th className="px-3 py-3">Utilisateur</th>
                <th className="px-5 py-3">Réf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E3E6]/80">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-[#FFF7F9]">
                  <td className="whitespace-nowrap px-5 py-3 text-[12px]">{formatMovementTime(m.createdAt)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/products/${m.productId}/`} className="font-semibold text-primary">
                      {m.productName}
                    </Link>
                    <span className="ml-1 font-mono text-[10px] text-ink/40">{m.productSku}</span>
                  </td>
                  <td className="px-3 py-3 text-[12px]">{MOVEMENT_TYPE_LABEL[m.type]}</td>
                  <td className={cn("px-3 py-3 font-mono text-[12px] font-bold", m.quantity < 0 ? "text-red-600" : "text-emerald-700")}>
                    {movementQtyLabel(m)}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-ink/60">{m.userName ?? "—"}</td>
                  <td className="px-5 py-3 text-[11px] text-ink/40">
                    {m.reason || m.referenceType || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FluxList({ movements }: { movements: InventoryMovementItem[] }) {
  if (movements.length === 0) {
    return <p className="text-[13px] text-ink/45">Aucun flux pour l’instant.</p>;
  }
  return (
    <div className="space-y-3.5">
      {movements.map((m) => {
        const tone = movementTone(m.type);
        return (
          <div key={m.id} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                tone === "in" && "bg-emerald-50 text-emerald-700",
                tone === "loss" && "bg-red-50 text-red-700",
                tone === "care" && "bg-[#FFF0F4] text-primary",
                tone === "sale" && "bg-[#FFF7E7] text-[#8C6510]",
                tone === "out" && "bg-[#FCE9F4] text-ink/55",
              )}
            >
              {tone === "in" ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-bold text-ink">{MOVEMENT_TYPE_LABEL[m.type]}</span>
                <span className="shrink-0 text-[11px] text-ink/40">{formatMovementTime(m.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-ink/50">
                {movementQtyLabel(m)} {m.productName}
                {m.userName ? ` · ${m.userName}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReceiptForm({
  products,
  defaultId,
  submitting,
  onSubmit,
}: {
  products: ProductListItem[];
  defaultId: string;
  submitting: boolean;
  onSubmit: (input: { productId: string; quantity: number; reason?: string }) => void;
}) {
  const [productId, setProductId] = useState(defaultId);
  const [qty, setQty] = useState("1");
  const [bl, setBl] = useState("");
  const [supplier, setSupplier] = useState("");
  const current = products.find((p) => p.id === productId) ?? products[0];

  useEffect(() => {
    if (defaultId) setProductId(defaultId);
  }, [defaultId]);

  useEffect(() => {
    if (current?.supplierName && !supplier) setSupplier(current.supplierName);
  }, [current, supplier]);

  if (products.length === 0) {
    return <p className="text-[13px] text-ink/45">Aucun produit actif.</p>;
  }

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const quantity = Number(qty);
        if (!quantity || !productId) return;
        const parts = [bl.trim() && `BL ${bl.trim()}`, supplier.trim()].filter(Boolean);
        onSubmit({ productId, quantity, reason: parts.join(" · ") || undefined });
      }}
    >
      <label className="sm:col-span-2 block text-[12px]">
        <span className="mb-1 block font-bold text-ink">Référence</span>
        <select
          value={productId || current?.id}
          onChange={(e) => setProductId(e.target.value)}
          className="h-10 w-full rounded-xl bg-[#FFF7F9] px-3 text-[13px] font-medium text-ink outline-none"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[12px]">
        <span className="mb-1 block font-bold text-ink">Quantité reçue</span>
        <Input type="number" min={0.001} step={0.001} value={qty} onChange={(e) => setQty(e.target.value)} required />
      </label>
      <label className="block text-[12px]">
        <span className="mb-1 block font-bold text-ink">N° bon de livraison</span>
        <Input value={bl} onChange={(e) => setBl(e.target.value)} placeholder="BL-2026-99" />
      </label>
      <label className="sm:col-span-2 block text-[12px]">
        <span className="mb-1 block font-bold text-ink">Fournisseur (motif)</span>
        <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nom du fournisseur" />
      </label>
      <p className="sm:col-span-2 text-[11px] text-ink/40">
        Crée un mouvement Achat. Le prix catalogue ne se modifie pas ici.
      </p>
      <button
        type="submit"
        disabled={submitting}
        className="sm:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#221820] text-[13px] font-bold text-white disabled:opacity-60"
      >
        Valider l’entrée en stock
      </button>
    </form>
  );
}

function InventoryCountForm({
  products,
  counts,
  onChange,
  canWrite,
  submitting,
  onSubmit,
  compact,
}: {
  products: ProductListItem[];
  counts: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  canWrite: boolean;
  submitting: boolean;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      <ul className={cn("divide-y divide-[#F0E3E6]", compact ? "max-h-64 overflow-y-auto rounded-xl bg-[#FFF7F9]" : "rounded-xl bg-[#FFF7F9]")}>
        {products.map((p) => {
          const counted = Number(counts[p.id]);
          const gap = !Number.isNaN(counted) ? counted - p.stock : 0;
          return (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-[12px]">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{p.name}</p>
                <p className="text-[11px] text-ink/45">Théo. {formatQty(p.stock, p.unit)}</p>
              </div>
              <Input
                type="number"
                step={0.001}
                className="w-24"
                value={counts[p.id] ?? ""}
                onChange={(e) => onChange({ ...counts, [p.id]: e.target.value })}
                disabled={!canWrite}
              />
              {gap !== 0 && !Number.isNaN(counted) ? (
                <span className={cn("w-14 text-right font-bold", gap < 0 ? "text-red-600" : "text-emerald-700")}>
                  {gap > 0 ? "+" : ""}
                  {gap.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                </span>
              ) : (
                <span className="w-14 text-right text-ink/30">0</span>
              )}
            </li>
          );
        })}
      </ul>
      {canWrite ? (
        <Button type="button" variant="primary" disabled={submitting} onClick={onSubmit} className="w-full">
          {submitting ? "Validation…" : "Valider l’inventaire"}
        </Button>
      ) : null}
    </div>
  );
}

function AdjustForm({
  products,
  defaultId,
  defaultType,
  submitting,
  onSubmit,
  onCancel,
}: {
  products: ProductListItem[];
  defaultId: string;
  defaultType: MovementType;
  submitting: boolean;
  onSubmit: (input: { productId: string; type: MovementType; quantity: number; reason?: string }) => void;
  onCancel: () => void;
}) {
  const [productId, setProductId] = useState(defaultId);
  const [type, setType] = useState<MovementType>(defaultType);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const current = products.find((p) => p.id === productId);

  useEffect(() => {
    setProductId(defaultId);
  }, [defaultId]);

  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  if (products.length === 0) {
    return <p className="text-sm text-ink/50">Aucun produit actif.</p>;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const qty = Number(quantity);
        if (!qty || !productId) return;
        onSubmit({ productId, type, quantity: qty, reason: reason.trim() || undefined });
      }}
    >
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Produit *</span>
        <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Choisir un produit</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </label>
      {current ? (
        <p className="text-sm text-ink/55">Stock actuel {formatQty(current.stock, current.unit)}</p>
      ) : null}
      <Select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
        <option value="ADJUSTMENT_IN">Entrée (ajustement +)</option>
        <option value="ADJUSTMENT_OUT">Sortie (ajustement −)</option>
        <option value="PURCHASE">Réception d’achat</option>
        <option value="LOSS">Perte</option>
        <option value="DAMAGE">Casse</option>
      </Select>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-ink/50">Quantité</span>
        <Input type="number" min={0.001} step={0.001} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (optionnel)" />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={submitting || !productId}>
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "emerald" | "warn" | "error" | "gold";
  onClick?: () => void;
}) {
  const box = {
    emerald: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-[#B67B00]",
    error: "bg-red-50 text-[#D81B43]",
    gold: "bg-[#FFF7E7] text-[#8C6510]",
  };
  const valueColor = {
    emerald: "text-emerald-700",
    warn: "text-[#B67B00]",
    error: "text-[#D81B43]",
    gold: "text-ink",
  };
  const className = "flex flex-col justify-between rounded-2xl bg-white p-4 text-left shadow-sm";
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", tone ? box[tone] : "bg-[#FFF7F9] text-ink/40")}>
          {icon}
        </span>
      </div>
      <div className="mt-3">
        <div className={cn("text-[26px] font-black tracking-tight", tone ? valueColor[tone] : "text-ink")}>{value}</div>
        <div className="mt-0.5 text-[11px] font-semibold text-ink/45">{hint}</div>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

function TabBtn({
  active,
  onClick,
  icon,
  danger,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold",
        active && "bg-primary font-bold text-white shadow-md",
        !active && !danger && "bg-white text-ink/55 shadow-sm",
        !active && danger && "bg-white text-[#D81B43] shadow-sm",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink/50 shadow-sm ring-1 ring-[#F0E3E6] hover:bg-[#FFF7F9] hover:text-ink"
    >
      {children}
    </button>
  );
}
