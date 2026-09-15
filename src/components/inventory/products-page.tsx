"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Download,
  Eye,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Table2,
  Truck,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { ProductFocusPanel } from "@/components/inventory/product-focus-panel";
import { ProductForm } from "@/components/inventory/product-form";
import {
  alertBarClass,
  alertChipClass,
  exportProductsCsv,
  isLowMargin,
  productMargin,
  STOCK_ALERT_LABEL,
  stockFillPercent,
  usageLabel,
} from "@/components/inventory/product-helpers";
import { ProductsMobile } from "@/components/inventory/products-mobile";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canAccessNav, canReadAnalytics, canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getAnalyticsInventory } from "@/modules/analytics/service";
import {
  createMovement,
  createProduct,
  formatMad,
  formatQty,
  getProduct,
  listProducts,
  updateProduct,
} from "@/modules/inventory/service";
import { listPurchases, listSuppliers } from "@/modules/procurement/service";
import type { InventoryAnalytics } from "@/types/analytics";
import type {
  MovementType,
  ProductCategory,
  ProductDetail,
  ProductListItem,
  StockAlertLevel,
  StockKpis,
} from "@/types/inventory";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

type UsageFilter = "all" | "sellable" | "consumable" | "hybrid";
type ViewMode = "table" | "grid";

export function ProductsPageView() {
  const { toast } = useToast();
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
  const [editing, setEditing] = useState<ProductDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("alert");
    if (a === "LOW" || a === "OUT" || a === "EXPIRING" || a === "EXPIRED") {
      setAlert(a);
    }
  }, []);

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
  const sellableCount = catalog.filter((p) => p.sellable).length;
  const cabineCount = catalog.filter((p) => p.consumable && !p.sellable).length;
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
    setEditing(null);
    toast(editing ? "Produit mis à jour." : "Produit créé.", "success");
    refresh();
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
    refresh();
  }

  function openAdjust() {
    if (!selected) {
      toast("Sélectionnez d’abord un produit.", "info");
      return;
    }
    setAdjustOpen(true);
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
        onAdjust={openAdjust}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">
              {user.orgName || "Votre institut"} · {ROLE_LABEL[user.role]}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFEFF8] px-2.5 py-1 text-[11px] font-medium text-ink/55">
              Stock par mouvements
            </span>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-[28px] font-bold leading-9 tracking-tight text-ink lg:text-[32px]">
                <Package size={26} className="text-primary" />
                Produits, stocks & rentabilité
              </h1>
              <p className="mt-1 max-w-3xl text-[15px] text-ink/50">
                Catalogue de revente et consommables — le stock se met à jour par les mouvements, jamais à la main.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportProductsCsv(catalog)}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink shadow-sm"
              >
                <Download size={16} />
                Exporter
              </button>
              {canWrite ? (
                <button
                  type="button"
                  onClick={openAdjust}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink shadow-sm"
                >
                  <SlidersHorizontal size={16} className="text-primary" />
                  Ajustement
                </button>
              ) : null}
              {showPurchases ? (
                <Link
                  href="/purchases/"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#221820] px-3.5 text-[13px] font-semibold text-white shadow-sm"
                >
                  <ShoppingBag size={16} />
                  Commande fournisseur
                </Link>
              ) : null}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => void openCreate()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md"
                >
                  <Plus size={18} />
                  Nouveau produit
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <AlertChip
            value={String(kpis?.outOfStockCount ?? 0)}
            label="Ruptures"
            tone="error"
            onClick={() => setAlert(alert === "OUT" ? "" : "OUT")}
            active={alert === "OUT"}
          />
          <AlertChip
            value={String(kpis?.lowStockCount ?? 0)}
            label="Sous le seuil"
            tone="warn"
            onClick={() => setAlert(alert === "LOW" ? "" : "LOW")}
            active={alert === "LOW"}
          />
          <AlertChip
            value={String(openOrders)}
            label="Commandes ouvertes"
            tone="gold"
            href={showPurchases ? "/purchases/" : undefined}
          />
          <AlertChip
            value={financeHidden ? "—" : String(lowMarginCount)}
            label="Marges < 25 %"
            tone="muted"
          />
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            label="Références"
            value={String(catalog.length)}
            hint={`${sellableCount} revente · ${cabineCount} cabine`}
            icon={Package}
          />
          <KpiCard label="Stock OK" value={String(optimalCount)} hint="Au-dessus du seuil" icon={Package} tone="emerald" />
          <KpiCard label="Stock bas" value={String(kpis?.lowStockCount ?? 0)} hint="Sous le minimum" icon={Package} tone="gold" />
          <KpiCard label="Ruptures" value={String(kpis?.outOfStockCount ?? 0)} hint="À commander" icon={Package} tone="error" />
          <KpiCard
            label="Valeur stock"
            value={financeHidden || !canExport || !kpis ? "—" : formatMad(kpis.totalStockValue)}
            hint="Prix d’achat × stock"
            icon={Wallet}
          />
          <KpiCard
            label="CA revente"
            value={financeHidden || !canExport || !inventory ? "—" : formatMad(inventory.posRevenue)}
            hint={
              inventory?.posMargin != null ? (
                <span className={inventory.posMargin >= 0 ? "text-emerald-700" : "text-red-700"}>
                  Marge {formatMad(inventory.posMargin)}
                </span>
              ) : (
                "Caisse POS du mois"
              )
            }
            icon={Wallet}
            tone="primary"
          />
        </section>

        <section className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#FFEFF8] p-1">
          <NavTab href="/products/" active>
            Catalogue ({catalog.length})
          </NavTab>
          {showPurchases ? (
            <NavTab href="/purchases/">
              Achats
              {openOrders ? (
                <span className="ml-1 rounded-full bg-[#FFDEA4] px-1.5 text-[10px] text-[#7B5900]">{openOrders}</span>
              ) : null}
            </NavTab>
          ) : null}
          {showSuppliers ? (
            <NavTab href="/suppliers/">Fournisseurs ({supplierCount})</NavTab>
          ) : null}
          <NavTab href="/stock/">Mouvements</NavTab>
        </section>

        <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm">
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

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
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
              filtered.map((p) => (
                <article
                  key={p.id}
                  onClick={() => {
                    setSelectedId(p.id);
                    setMenuId(null);
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl bg-white p-4 shadow-sm",
                    selected?.id === p.id && "ring-1 ring-primary/15",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[16px] font-bold text-ink">{p.name}</h3>
                      <p className="text-[12px] text-ink/45">
                        {p.sku} · {PRODUCT_CATEGORY_LABEL[p.category]}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", alertChipClass(p.alert))}>
                      {STOCK_ALERT_LABEL[p.alert]}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] text-ink/55">
                    {formatQty(p.stock, p.unit)} · {usageLabel(p)}
                  </p>
                </article>
              ))
            ) : (
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E4BDC2]/40 text-[11px] uppercase tracking-wider text-ink/40">
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
                      const m = productMargin(p);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => {
                            setSelectedId(p.id);
                            setMenuId(null);
                          }}
                          className={cn(
                            "cursor-pointer border-b border-[#E4BDC2]/20 hover:bg-[#FFEFF8]/60",
                            selected?.id === p.id && "bg-[#FFEFF8]",
                            p.alert === "OUT" && "bg-red-50/40",
                          )}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink">{p.name}</p>
                            <p className="font-mono text-[11px] text-ink/40">
                              {p.sku} · {usageLabel(p)}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-ink/55">{PRODUCT_CATEGORY_LABEL[p.category]}</td>
                          <td className="px-3 py-3">
                            <p className="text-[12px] font-semibold">
                              {formatQty(p.stock, p.unit)}
                              <span className="ml-1 font-normal text-ink/40">/ {p.minStock}</span>
                            </p>
                            <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-[#F0DDE9]">
                              <div
                                className={cn("h-full rounded-full", alertBarClass(p.alert))}
                                style={{ width: `${stockFillPercent(p)}%` }}
                              />
                            </div>
                            <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold", alertChipClass(p.alert))}>
                              {STOCK_ALERT_LABEL[p.alert]}
                            </span>
                          </td>
                          {!financeHidden ? (
                            <>
                              <td className="px-3 py-3 text-right">{formatMad(p.purchasePrice)}</td>
                              <td className="px-3 py-3 text-right font-semibold">
                                {p.salePrice != null ? formatMad(p.salePrice) : "—"}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {m ? (
                                  <span className={m.pct < 25 ? "font-bold text-red-700" : "font-bold text-emerald-700"}>
                                    {m.pct.toFixed(0)} %
                                  </span>
                                ) : (
                                  <span className="text-ink/35">—</span>
                                )}
                              </td>
                            </>
                          ) : null}
                          <td className="relative px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                title="Fiche"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(p.id);
                                }}
                                className="rounded-lg p-1.5 text-ink/40 hover:bg-[#FCE9F4] hover:text-primary"
                              >
                                <Eye size={16} />
                              </button>
                              {canWrite ? (
                                <button
                                  type="button"
                                  aria-label="Actions"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuId(menuId === p.id ? null : p.id);
                                  }}
                                  className="rounded-lg p-1.5 text-ink/40 hover:bg-[#FCE9F4] hover:text-ink"
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                              ) : null}
                            </div>
                            {menuId === p.id && canWrite ? (
                              <div
                                className="absolute right-4 top-12 z-10 min-w-[160px] rounded-xl bg-white py-1 text-left shadow-lg ring-1 ring-black/5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => void openEdit(p.id)}
                                  className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]"
                                >
                                  Modifier
                                </button>
                                <Link href={`/products/${p.id}/`} className="block px-3 py-2 text-[13px] hover:bg-[#FFEFF8]">
                                  Fiche complète
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => void handleToggle(p)}
                                  className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]"
                                >
                                  {p.active ? "Désactiver" : "Réactiver"}
                                </button>
                              </div>
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

          <div className="lg:sticky lg:top-20 lg:col-span-5">
            {selected ? (
              <ProductFocusPanel
                productId={selected.id}
                fallback={selected}
                insight={insight}
                canWrite={canWrite}
                financeHidden={financeHidden}
                onEdit={() => void openEdit(selected.id)}
                onToggle={() => void handleToggle(selected)}
                onAdjust={openAdjust}
              />
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
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

      <Drawer open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Ajuster le stock">
        {selected ? (
          <AdjustForm
            productName={selected.name}
            unitLabel={formatQty(selected.stock, selected.unit)}
            submitting={submitting}
            onCancel={() => setAdjustOpen(false)}
            onSubmit={async (input) => {
              setSubmitting(true);
              const result = await createMovement({
                productId: selected.id,
                type: input.type,
                quantity: input.quantity,
                reason: input.reason,
                referenceType: "MANUAL",
              });
              setSubmitting(false);
              if (!result.ok) {
                toast(result.error, "error");
                return;
              }
              setAdjustOpen(false);
              toast("Mouvement enregistré.", "success");
              refresh();
            }}
          />
        ) : (
          <p className="text-sm text-ink/50">Sélectionnez un produit.</p>
        )}
      </Drawer>
    </div>
  );
}

function AdjustForm({
  productName,
  unitLabel,
  submitting,
  onSubmit,
  onCancel,
}: {
  productName: string;
  unitLabel: string;
  submitting: boolean;
  onSubmit: (input: { type: MovementType; quantity: number; reason?: string }) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<MovementType>("ADJUSTMENT_IN");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const qty = Number(quantity);
        if (!qty) return;
        onSubmit({ type, quantity: qty, reason: reason.trim() || undefined });
      }}
    >
      <p className="text-sm text-ink/55">
        {productName} · stock actuel {unitLabel}
      </p>
      <Select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
        <option value="ADJUSTMENT_IN">Entrée (ajustement +)</option>
        <option value="ADJUSTMENT_OUT">Sortie (ajustement −)</option>
        <option value="PURCHASE">Réception d’achat</option>
        <option value="LOSS">Perte</option>
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
        <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

function AlertChip({
  value,
  label,
  tone,
  onClick,
  href,
  active,
}: {
  value: string;
  label: string;
  tone: "error" | "warn" | "gold" | "muted";
  onClick?: () => void;
  href?: string;
  active?: boolean;
}) {
  const icon =
    tone === "error" ? Package : tone === "gold" ? Truck : tone === "warn" ? Package : Wallet;
  const Icon = icon;
  const box = {
    error: "bg-red-50 text-red-800",
    warn: "bg-amber-50 text-[#7B5900]",
    gold: "bg-[#FFDEA4]/50 text-[#7B5900]",
    muted: "bg-[#FCE9F4] text-ink/60",
  };
  const className = cn(
    "flex items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm",
    active && "ring-1 ring-primary/20",
    (onClick || href) && "cursor-pointer hover:bg-[#FFEFF8]",
  );
  const inner = (
    <>
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", box[tone])}>
        <Icon size={18} />
      </span>
      <span>
        <span className="block font-display text-[22px] font-bold leading-6 text-ink">{value}</span>
        <span className="text-[12px] text-ink/50">{label}</span>
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint: ReactNode;
  icon: typeof Package;
  tone?: "ink" | "emerald" | "gold" | "primary" | "error";
}) {
  const box = {
    ink: "bg-[#FCE9F4] text-primary",
    emerald: "bg-emerald-50 text-emerald-700",
    gold: "bg-[#FFDEA4]/50 text-[#7B5900]",
    primary: "bg-[#FFD9DE] text-primary",
    error: "bg-red-50 text-red-700",
  };
  const valueColor = {
    ink: "text-ink",
    emerald: "text-ink",
    gold: "text-[#7B5900]",
    primary: "text-primary",
    error: "text-red-700",
  };
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", box[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2">
        <p className={cn("font-display text-[26px] font-extrabold leading-8", valueColor[tone])}>{value}</p>
        <p className="mt-2 text-[12px] text-ink/50">{hint}</p>
      </div>
    </div>
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

function NavTab({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-lg px-3.5 py-2 text-[13px] font-semibold",
        active ? "bg-white text-primary shadow-sm" : "text-ink/50 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
