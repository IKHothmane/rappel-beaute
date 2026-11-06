"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  MoreHorizontal,
  Search,
  Table2,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { InventoryPremiumHeader } from "@/components/inventory/inventory-premium-header";
import { ProductFocusPanel } from "@/components/inventory/product-focus-panel";
import { ProductForm } from "@/components/inventory/product-form";
import {
  categoryToneClass,
  ProductPremiumCard,
} from "@/components/inventory/product-premium-card";
import {
  alertBarClass,
  alertChipClass,
  isLowMargin,
  productMargin,
  STOCK_ALERT_LABEL,
  stockFillPercent,
} from "@/components/inventory/product-helpers";
import { ProductsMobile } from "@/components/inventory/products-mobile";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canReadAnalytics, canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getAnalyticsInventory } from "@/modules/analytics/service";
import {
  createMovement,
  createProduct,
  deleteProduct,
  formatMad,
  formatQty,
  getProduct,
  listProducts,
  updateProduct,
} from "@/modules/inventory/service";
import { listPurchases, listSuppliers } from "@/modules/procurement/service";
import type { InventoryAnalytics } from "@/types/analytics";
import type {
  ProductCategory,
  ProductDetail,
  ProductListItem,
  StockAlertLevel,
  StockKpis,
} from "@/types/inventory";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

type UsageFilter = "all" | "sellable" | "consumable" | "hybrid";
type ViewMode = "table" | "grid";

type ProductsPageViewProps = {
  createRequestId?: number;
  hideOverview?: boolean;
  onCatalogChanged?: () => void;
};

export function ProductsPageView({
  createRequestId = 0,
  hideOverview = false,
  onCatalogChanged,
}: ProductsPageViewProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const canExport = canReadAnalytics(user.role) && !financeHidden;
  const showPurchases = canAccessNav(user.role, "purchases");
  const showSuppliers = canAccessNav(user.role, "suppliers");

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [alert, setAlert] = useState<StockAlertLevel | "">("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [supplier, setSupplier] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [catalog, setCatalog] = useState<ProductListItem[]>([]);
  const [kpis, setKpis] = useState<StockKpis | null>(null);
  const [total, setTotal] = useState(0);
  const [inventory, setInventory] = useState<InventoryAnalytics | null>(null);
  const [openOrders, setOpenOrders] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [stockMode, setStockMode] = useState<"IN" | "OUT">("IN");
  const [editing, setEditing] = useState<ProductDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<ProductListItem[]>([]);
  catalogRef.current = catalog;

  useEffect(() => {
    const a = searchParams.get("alert");
    if (a === "LOW" || a === "OUT" || a === "EXPIRING" || a === "EXPIRED") {
      setAlert(a);
    } else {
      setAlert("");
    }
  }, [searchParams]);

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
      const res = await listProducts({ limit: 100 });
      setCatalog(res.data);
      setKpis(res.kpis);
      setTotal(res.pagination.total);
      setSelectedId((current) => {
        if (current && res.data.some((row) => row.id === current)) return current;
        return res.data[0]?.id ?? null;
      });
    } catch {
      toast("Impossible de charger les produits.", "error");
    }
  }, [toast]);

  const refreshAll = useCallback(async () => {
    await refresh();
    onCatalogChanged?.();
  }, [refresh, onCatalogChanged]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!financeHidden) {
      getAnalyticsInventory({ preset: "month" })
        .then(setInventory)
        .catch(() => setInventory(null));
    }
    if (showPurchases) {
      listPurchases({ limit: 1 })
        .then((r) => setOpenOrders(r.kpis.awaitingReceiptCount + r.kpis.orderedCount))
        .catch(() => setOpenOrders(0));
    }
    if (showSuppliers) {
      listSuppliers({ limit: 1, active: true })
        .then((r) => setSupplierCount(r.kpis.activeCount))
        .catch(() => setSupplierCount(0));
    }
  }, [financeHidden, showPurchases, showSuppliers]);

  const categoryCounts = useMemo(() => {
    const map = new Map<ProductCategory, number>();
    for (const p of catalog) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return PRODUCT_CATEGORIES.filter((c) => map.has(c)).map(
      (c) => [c, map.get(c) ?? 0] as [ProductCategory, number],
    );
  }, [catalog]);

  const categorySlices = useMemo(() => {
    const map = new Map<ProductCategory, { count: number; value: number }>();
    for (const p of catalog) {
      const current = map.get(p.category) ?? { count: 0, value: 0 };
      current.count += 1;
      current.value += (p.stock ?? 0) * (p.purchasePrice ?? 0);
      map.set(p.category, current);
    }
    return PRODUCT_CATEGORIES.filter((c) => map.has(c)).map((c) => {
      const row = map.get(c)!;
      return {
        key: c,
        label: PRODUCT_CATEGORY_LABEL[c],
        count: row.count,
        value: Math.round(row.value * 100) / 100,
      };
    });
  }, [catalog]);

  const suppliers = useMemo(() => {
    const set = new Set<string>();
    for (const p of catalog) {
      if (p.supplierName?.trim()) set.add(p.supplierName.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return catalog.filter((p) => {
      if (category && p.category !== category) return false;
      if (alert && p.alert !== alert) return false;
      if (supplier && (p.supplierName ?? "") !== supplier) return false;
      if (usage === "sellable" && !(p.sellable && !p.consumable)) return false;
      if (usage === "consumable" && !(p.consumable && !p.sellable)) return false;
      if (usage === "hybrid" && !(p.sellable && p.consumable)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.supplierName ?? "").toLowerCase().includes(q)
      );
    });
  }, [catalog, search, category, alert, supplier, usage]);

  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;
  const optimalCount = catalog.filter((p) => p.active && p.alert === "OK").length;
  const lowMarginCount = catalog.filter((p) => isLowMargin(p)).length;

  const insight = useMemo(() => {
    const top = inventory?.topPosProducts[0];
    if (top) {
      const match = catalog.find((p) => p.id === top.productId);
      let text = `${top.productName} est le plus vendu en caisse ce mois (${top.quantity} vente${top.quantity > 1 ? "s" : ""}, ${formatMad(top.revenue)}).`;
      if (match && (match.alert === "LOW" || match.alert === "OUT")) {
        text += ` Stock actuel : ${formatQty(match.stock, match.unit)} (seuil ${match.minStock}).`;
      }
      return text;
    }
    const urgent = catalog.find((p) => p.alert === "OUT") ?? catalog.find((p) => p.alert === "LOW");
    if (urgent) {
      return `${urgent.name} est ${urgent.alert === "OUT" ? "en rupture" : "sous le seuil"} (${formatQty(urgent.stock, urgent.unit)} / min ${urgent.minStock}).`;
    }
    return "Pas encore assez de ventes produits ce mois pour comparer les sorties.";
  }, [inventory, catalog]);

  async function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
    setMenuId(null);
  }

  useEffect(() => {
    if (createRequestId > 0) void openCreate();
  }, [createRequestId]);

  async function openEdit(id: string) {
    try {
      const detail = await getProduct(id);
      setEditing(detail);
      setDrawerOpen(true);
      setMenuId(null);
    } catch {
      toast("Impossible de charger le produit.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createProduct>[0]) {
    setSubmitting(true);
    const result = editing ? await updateProduct(editing.id, data) : await createProduct(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    const createdId = !editing ? result.product.id : null;
    setEditing(null);
    if (createdId) setSelectedId(createdId);
    toast(editing ? "Produit mis à jour." : "Produit créé.", "success");
    void refreshAll();
  }

  async function handleToggle(row: ProductListItem) {
    if (!canWrite) return;
    const result = await updateProduct(row.id, { active: !row.active });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(row.active ? "Produit désactivé." : "Produit réactivé.", "success");
    setMenuId(null);
    void refreshAll();
  }

  async function handleDelete(row: ProductListItem) {
    if (!canWrite) return;
    const ok = window.confirm(`Supprimer « ${row.name} » ? Il disparaîtra du catalogue.`);
    if (!ok) {
      setMenuId(null);
      return;
    }
    const result = await deleteProduct(row.id);
    if (!result.ok) {
      toast(result.error, "error");
      setMenuId(null);
      return;
    }
    toast("Produit supprimé.", "success");
    setMenuId(null);
    if (selectedId === row.id) setSelectedId(null);
    void refreshAll();
  }

  function openStock(mode: "IN" | "OUT", productId?: string) {
    const id = productId ?? selected?.id;
    if (!id) {
      toast("Sélectionnez d’abord un produit.", "info");
      return;
    }
    if (productId) setSelectedId(productId);
    setStockMode(mode);
    setAdjustOpen(true);
  }

  async function applyStock(mode: "IN" | "OUT", productId?: string) {
    const id = productId ?? selected?.id;
    if (!id) return;
    const row = catalogRef.current.find((p) => p.id === id);
    if (!row) return;
    if (mode === "OUT" && row.stock <= 0) {
      toast("Stock déjà à 0.", "info");
      return;
    }
    const stock = mode === "IN" ? row.stock + 1 : row.stock - 1;
    const alert: StockAlertLevel =
      row.alert === "EXPIRING" || row.alert === "EXPIRED"
        ? row.alert
        : stock <= 0
          ? "OUT"
          : stock <= row.minStock
            ? "LOW"
            : "OK";
    const next = catalogRef.current.map((p) =>
      p.id === id
        ? {
            ...p,
            stock,
            alert,
            stockValue: Math.round(stock * p.purchasePrice * 100) / 100,
          }
        : p,
    );
    catalogRef.current = next;
    setCatalog(next);
    const result = await createMovement({
      productId: id,
      type: mode === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      quantity: 1,
      referenceType: "MANUAL",
    });
    if (!result.ok) {
      toast(result.error, "error");
      void refreshAll();
    } else {
      onCatalogChanged?.();
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <ProductsMobile
        orgName={user.orgName}
        catalogCount={catalog.length}
        kpis={kpis}
        optimalCount={optimalCount}
        openOrders={openOrders}
        supplierCount={supplierCount}
        lowMarginCount={lowMarginCount}
        canWrite={canWrite}
        financeHidden={financeHidden}
        posRevenue={financeHidden ? null : (inventory?.posRevenue ?? null)}
        posMargin={financeHidden ? null : (inventory?.posMargin ?? null)}
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
        categoryCounts={categoryCounts}
        filtered={filtered}
        loading={loading}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        selected={selected}
        onCreate={() => void openCreate()}
        onEdit={(id) => void openEdit(id)}
        onToggle={(row) => void handleToggle(row)}
        onDelete={(row) => void handleDelete(row)}
        onAdjustIn={(id) => openStock("IN", id)}
        onAdjustOut={(id) => openStock("OUT", id)}
        onStepIn={(id) => void applyStock("IN", id)}
        onStepOut={(id) => void applyStock("OUT", id)}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        {!hideOverview ? (
          <InventoryPremiumHeader
            total={total}
            inStock={optimalCount}
            lowStock={kpis?.lowStockCount ?? 0}
            outOfStock={kpis?.outOfStockCount ?? 0}
            stockValue={
              financeHidden || !canExport || !kpis ? null : formatMad(kpis.totalStockValue)
            }
            financeHidden={financeHidden || !canExport}
            categories={categorySlices}
            onLowStock={() => setAlert(alert === "LOW" ? "" : "LOW")}
            onOutOfStock={() => setAlert(alert === "OUT" ? "" : "OUT")}
          />
        ) : null}

        <div className="flex flex-col gap-3 rounded-[22px] border border-[#F0DDE4] bg-white p-3 shadow-sm">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterPill active={category === ""} onClick={() => setCategory("")}>
              Tous ({catalog.length})
            </FilterPill>
            {categoryCounts.map(([c, n]) => (
              <FilterPill key={c} active={category === c} onClick={() => setCategory(c)}>
                {PRODUCT_CATEGORY_LABEL[c]} ({n})
              </FilterPill>
            ))}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[240px] flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un produit, un SKU, une marque… (⌘K)"
                className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-11 pr-14 text-sm text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#F6E3EF] px-1.5 py-0.5 font-mono text-[10px] text-ink/45">
                ⌘K
              </span>
            </div>
            <select
              value={usage}
              onChange={(e) => setUsage(e.target.value as UsageFilter)}
              className="h-11 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink outline-none"
            >
              <option value="all">Tous les usages</option>
              <option value="sellable">Revente boutique</option>
              <option value="consumable">Consommable cabine</option>
              <option value="hybrid">Hybride</option>
            </select>
            <select
              value={alert}
              onChange={(e) => setAlert(e.target.value as StockAlertLevel | "")}
              className="h-11 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink outline-none"
            >
              <option value="">Tous les stocks</option>
              <option value="OK">En stock</option>
              <option value="LOW">Stock bas</option>
              <option value="OUT">Rupture</option>
              <option value="EXPIRING">Expire bientôt</option>
              <option value="EXPIRED">Expiré</option>
            </select>
            {suppliers.length > 1 ? (
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="h-11 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink outline-none"
              >
                <option value="">Tous les fournisseurs</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="flex rounded-lg bg-[#FFEFF8] p-1">
              <button
                type="button"
                title="Vue tableau"
                onClick={() => setViewMode("table")}
                className={cn("rounded-md p-1.5", viewMode === "table" ? "bg-white text-primary shadow-sm" : "text-ink/40")}
              >
                <Table2 size={16} />
              </button>
              <button
                type="button"
                title="Vue cartes"
                onClick={() => setViewMode("grid")}
                className={cn("rounded-md p-1.5", viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-ink/40")}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="flex flex-col gap-3 xl:col-span-8">
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              <span>
                {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
                {total > catalog.length ? ` · ${catalog.length} affichés sur ${total}` : ""}
              </span>
              <Link href="/stock/" className="text-primary">
                Journal stock
              </Link>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-ink/40">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink/45">Aucun produit trouvé.</p>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filtered.map((p) => (
                  <ProductPremiumCard
                    key={p.id}
                    product={p}
                    selected={selected?.id === p.id}
                    canWrite={canWrite}
                    financeHidden={financeHidden}
                    menuOpen={menuId === p.id}
                    onSelect={() => {
                      setSelectedId(p.id);
                      setMenuId(null);
                    }}
                    onMenu={() => setMenuId(menuId === p.id ? null : p.id)}
                    menu={
                      canWrite ? (
                        <ProductActionsMenu
                          active={p.active}
                          onEdit={() => void openEdit(p.id)}
                          onToggle={() => void handleToggle(p)}
                          onDelete={() => void handleDelete(p)}
                        />
                      ) : null
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[22px] border border-[#F0DDE4] bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#F0DDE4] bg-[#FFF0F6] text-[11px] uppercase tracking-wider text-[#74334E]">
                      <th className="px-4 py-3 font-semibold">Produit</th>
                      <th className="px-3 py-3 font-semibold">Catégorie</th>
                      <th className="px-3 py-3 font-semibold">Stock</th>
                      {!financeHidden ? (
                        <>
                          <th className="px-3 py-3 text-right font-semibold">Achat</th>
                          <th className="px-3 py-3 text-right font-semibold">Vente</th>
                          <th className="px-3 py-3 text-right font-semibold">Marge</th>
                        </>
                      ) : null}
                      <th className="px-4 py-3 text-right font-semibold"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const margin = productMargin(p);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => {
                            setSelectedId(p.id);
                            setMenuId(null);
                          }}
                          className={cn(
                            "cursor-pointer border-b border-[#F0DDE4]/70 hover:bg-[#FFF7FA]",
                            selected?.id === p.id && "bg-[#FFF0F6]",
                            p.alert === "OUT" && selected?.id !== p.id && "bg-red-50/40",
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#43182D]">{p.name}</p>
                              <p className="font-mono text-[11px] text-[#846A79]">
                                {p.sku}
                                {p.brand ? ` · ${p.brand}` : ""}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                categoryToneClass(p.category),
                              )}
                            >
                              {PRODUCT_CATEGORY_LABEL[p.category]}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-[12px] font-semibold text-[#43182D]">
                              {formatQty(p.stock, p.unit)}
                              <span className="ml-1 font-normal text-[#846A79]">/ {p.minStock}</span>
                            </p>
                            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[#F0DDE9]">
                              <div
                                className={cn("h-full rounded-full", alertBarClass(p.alert))}
                                style={{ width: `${stockFillPercent(p)}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                                alertChipClass(p.alert),
                              )}
                            >
                              {STOCK_ALERT_LABEL[p.alert]}
                            </span>
                          </td>
                          {!financeHidden ? (
                            <>
                              <td className="px-3 py-3 text-right text-[#43182D]">
                                {formatMad(p.purchasePrice)}
                              </td>
                              <td className="px-3 py-3 text-right font-semibold text-[#43182D]">
                                {p.salePrice != null ? formatMad(p.salePrice) : "—"}
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-3 text-right font-bold",
                                  margin && margin.pct < 25 ? "text-red-700" : "text-emerald-700",
                                )}
                              >
                                {margin ? `${margin.pct.toFixed(0)} %` : "—"}
                              </td>
                            </>
                          ) : null}
                          <td className="relative px-4 py-3 text-right">
                            {canWrite ? (
                              <button
                                type="button"
                                aria-label="Actions"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuId(menuId === p.id ? null : p.id);
                                }}
                                className="rounded-xl p-1.5 text-[#846A79] hover:bg-[#FFF0F6] hover:text-[#AC0E4C]"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            ) : null}
                            {menuId === p.id && canWrite ? (
                              <ProductActionsMenu
                                active={p.active}
                                onEdit={() => void openEdit(p.id)}
                                onToggle={() => void handleToggle(p)}
                                onDelete={() => void handleDelete(p)}
                              />
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="xl:sticky xl:top-20 xl:col-span-4">
            {selected ? (
              <ProductFocusPanel
                productId={selected.id}
                fallback={selected}
                insight={insight}
                canWrite={canWrite}
                financeHidden={financeHidden}
                onEdit={() => void openEdit(selected.id)}
                onIn={() => void applyStock("IN")}
                onOut={() => void applyStock("OUT")}
              />
            ) : (
              <div className="rounded-[22px] border border-[#F0DDE4] bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
                Sélectionnez un produit pour afficher sa fiche.
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier le produit" : "Nouveau produit"}
      >
        <ProductForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
        />
      </Drawer>

      <Drawer
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title={stockMode === "IN" ? "Entrée de stock" : "Sortie de stock"}
      >
        {selected ? (
          <StockMoveForm
            key={`${selected.id}-${stockMode}`}
            mode={stockMode}
            productName={selected.name}
            unitLabel={formatQty(selected.stock, selected.unit)}
            submitting={submitting}
            onCancel={() => setAdjustOpen(false)}
            onSubmit={async (quantity) => {
              setSubmitting(true);
              const result = await createMovement({
                productId: selected.id,
                type: stockMode === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
                quantity,
                referenceType: "MANUAL",
              });
              setSubmitting(false);
              if (!result.ok) {
                toast(result.error, "error");
                return;
              }
              setAdjustOpen(false);
              toast(stockMode === "IN" ? "Quantité ajoutée au stock." : "Quantité retirée du stock.", "success");
              void refreshAll();
            }}
          />
        ) : (
          <p className="text-sm text-ink/50">Sélectionnez un produit.</p>
        )}
      </Drawer>
    </div>
  );
}

function ProductActionsMenu({
  active,
  onEdit,
  onToggle,
  onDelete,
}: {
  active: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="absolute right-3 top-12 z-20 min-w-[160px] overflow-hidden rounded-xl border border-[#F0DDE4] bg-white py-1 text-left shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={onEdit} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFF0F6]">
        Modifier
      </button>
      <button type="button" onClick={onToggle} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]">
        {active ? "Désactiver" : "Réactiver"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="block w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
      >
        Supprimer
      </button>
    </div>
  );
}

function StockMoveForm({
  mode,
  productName,
  unitLabel,
  submitting,
  onSubmit,
  onCancel,
}: {
  mode: "IN" | "OUT";
  productName: string;
  unitLabel: string;
  submitting: boolean;
  onSubmit: (quantity: number) => void;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState("1");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const qty = Number(quantity);
        if (!qty || qty <= 0) return;
        onSubmit(qty);
      }}
    >
      <p className="text-sm text-ink/55">
        {productName} · stock actuel <strong className="text-ink">{unitLabel}</strong>
      </p>
      <p className="text-[13px] text-ink/55">
        {mode === "IN"
          ? "Cette quantité est ajoutée directement au stock."
          : "Cette quantité est retirée directement du stock."}
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-ink/50">Quantité</span>
        <Input type="number" min={0.001} step={0.001} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : mode === "IN" ? "Ajouter" : "Retirer"}
        </Button>
      </div>
    </form>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold",
        active ? "bg-primary text-white shadow-sm" : "bg-[#FFEFF8] text-ink hover:bg-[#FCE9F4]",
      )}
    >
      {children}
    </button>
  );
}
