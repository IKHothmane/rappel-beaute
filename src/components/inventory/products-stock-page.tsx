"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  History,
  Package,
  Plus,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { InventoryPageView } from "@/components/inventory/inventory-page";
import { InventoryPremiumHeader } from "@/components/inventory/inventory-premium-header";
import { ProductsPageView } from "@/components/inventory/products-page";
import { canReadAnalytics, canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatMad, listProducts } from "@/modules/inventory/service";
import type { ProductCategory, ProductListItem, StockKpis } from "@/types/inventory";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

type ProductsStockTab = "catalogue" | "stock" | "mouvements" | "inventaire" | "alertes";

const TABS: { id: ProductsStockTab; label: string; icon: typeof Package }[] = [
  { id: "catalogue", label: "Catalogue", icon: Package },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "mouvements", label: "Mouvements", icon: History },
  { id: "inventaire", label: "Inventaire", icon: ClipboardList },
  { id: "alertes", label: "Alertes", icon: AlertTriangle },
];

function parseTab(value: string | null): ProductsStockTab {
  if (value === "stock" || value === "mouvements" || value === "inventaire" || value === "alertes") {
    return value;
  }
  return "catalogue";
}

export function ProductsStockPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const canExport = canReadAnalytics(user.role) && !financeHidden;
  const currentTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);
  const [createRequestId, setCreateRequestId] = useState(0);
  const [catalog, setCatalog] = useState<ProductListItem[]>([]);
  const [kpis, setKpis] = useState<StockKpis | null>(null);
  const [total, setTotal] = useState(0);

  const refreshOverview = useCallback(async () => {
    try {
      const res = await listProducts({ limit: 100 });
      setCatalog(res.data);
      setKpis(res.kpis);
      setTotal(res.pagination.total);
    } catch {
      /* overview non bloquant */
    }
  }, []);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  const optimalCount = useMemo(
    () => catalog.filter((p) => p.active && p.alert === "OK").length,
    [catalog],
  );

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

  function setTab(tab: ProductsStockTab, extra?: { alert?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "catalogue") params.delete("tab");
    else params.set("tab", tab);
    if (extra?.alert === null) params.delete("alert");
    else if (extra?.alert) params.set("alert", extra.alert);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleCreateProduct() {
    if (currentTab !== "catalogue") setTab("catalogue");
    setCreateRequestId((n) => n + 1);
  }

  function handleLowStock() {
    const next = searchParams.get("alert") === "LOW" ? null : "LOW";
    setTab("catalogue", { alert: next });
  }

  function handleOutOfStock() {
    const next = searchParams.get("alert") === "OUT" ? null : "OUT";
    setTab("catalogue", { alert: next });
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-gradient-to-r from-[#FFF7F7] via-[#FFEFEF] to-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7">
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Produits & Stock
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Gérez le catalogue, les niveaux de stock, les mouvements, l’inventaire et les alertes
            dans un seul espace.
          </p>
        </div>

        {canWrite ? (
          <button
            type="button"
            onClick={handleCreateProduct}
            className="relative z-10 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#AC0E4C] px-5 text-sm font-semibold text-white shadow-lg shadow-[#AC0E4C]/15 transition hover:bg-[#850F3C]"
          >
            <Plus size={17} />
            Nouveau produit
          </button>
        ) : null}
      </header>

      <div className="hidden lg:block">
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
          onLowStock={handleLowStock}
          onOutOfStock={handleOutOfStock}
        />
      </div>

      <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-[#F1E8EC] bg-white p-2 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200",
                active ? "bg-[#981C52] text-white shadow-sm" : "text-[#765E6B] hover:bg-[#FAF0F5]",
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {currentTab === "catalogue" ? (
        <ProductsPageView
          createRequestId={createRequestId}
          hideOverview
          onCatalogChanged={refreshOverview}
        />
      ) : (
        <InventoryPageView
          key={currentTab}
          hideKpis
          initialTab={
            currentTab === "mouvements"
              ? "mouvements"
              : currentTab === "inventaire"
                ? "inventaire"
                : currentTab === "alertes"
                  ? "alertes"
                  : "niveaux"
          }
        />
      )}
    </div>
  );
}
