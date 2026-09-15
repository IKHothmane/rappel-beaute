"use client";

import Link from "next/link";
import { type ReactNode, type RefObject, useEffect, useState } from "react";
import { LayoutList, Plus, Search, ShoppingBag, SlidersHorizontal, Sparkles } from "lucide-react";
import { ProductFocusPanel } from "@/components/inventory/product-focus-panel";
import {
  alertChipClass,
  isLowMargin,
  productMargin,
  STOCK_ALERT_LABEL,
  usageLabel,
} from "@/components/inventory/product-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatQty } from "@/modules/inventory/service";
import type { ProductCategory, ProductListItem, StockAlertLevel, StockKpis } from "@/types/inventory";
import { PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

type UsageFilter = "all" | "sellable" | "consumable" | "hybrid";
type MobileView = "list" | "focus";

type ProductsMobileProps = {
  orgName: string;
  catalogCount: number;
  kpis: StockKpis | null;
  optimalCount: number;
  openOrders: number;
  supplierCount: number;
  lowMarginCount: number;
  canWrite: boolean;
  financeHidden: boolean;
  posRevenue: number | null;
  posMargin: number | null;
  insight: string;
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  category: ProductCategory | "";
  onCategory: (c: ProductCategory | "") => void;
  alert: StockAlertLevel | "";
  onAlert: (a: StockAlertLevel | "") => void;
  usage: UsageFilter;
  onUsage: (u: UsageFilter) => void;
  categoryCounts: [ProductCategory, number][];
  filtered: ProductListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: ProductListItem | null;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onToggle: (row: ProductListItem) => void;
  onAdjust: () => void;
};

export function ProductsMobile({
  orgName,
  catalogCount,
  kpis,
  optimalCount,
  openOrders,
  supplierCount,
  lowMarginCount,
  canWrite,
  financeHidden,
  posRevenue,
  posMargin,
  insight,
  searchInput,
  onSearchChange,
  searchRef,
  category,
  onCategory,
  alert,
  onAlert,
  usage,
  onUsage,
  categoryCounts,
  filtered,
  loading,
  selectedId,
  onSelect,
  selected,
  onCreate,
  onEdit,
  onToggle,
  onAdjust,
}: ProductsMobileProps) {
  const [view, setView] = useState<MobileView>("list");
  const focusName = selected?.name ?? "360°";

  function openFocus(id: string) {
    onSelect(id);
    setView("focus");
  }

  useEffect(() => {
    if (view === "focus" && !selected) setView("list");
  }, [view, selected]);

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
            Produits & stock
          </h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            {catalogCount} {catalogCount > 1 ? "références" : "référence"} · {orgName || "Votre institut"}
          </p>
        </div>
        <div className={cn("grid gap-2", canWrite ? "grid-cols-2" : "grid-cols-1")}>
          {canWrite ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-[13px] font-semibold text-white shadow-md active:scale-[0.98]"
            >
              <Plus size={18} />
              Nouveau produit
            </button>
          ) : null}
          {canWrite ? (
            <button
              type="button"
              onClick={onAdjust}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#F0DDE9] text-[13px] font-semibold text-ink"
            >
              Ajustement
            </button>
          ) : (
            <Link
              href="/stock/"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#F0DDE9] text-[13px] font-semibold text-ink"
            >
              Mouvements
            </Link>
          )}
        </div>
      </section>

      <div className="rounded-xl bg-[#FFEFF8] p-3.5">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-primary">
          <Sparkles size={14} />
          Insight catalogue
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink">{insight}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Valeur stock" value={financeHidden || !kpis ? "—" : formatMad(kpis.totalStockValue)} hint="Valorisation achat" />
        <Kpi
          label="CA revente"
          value={financeHidden || posRevenue == null ? "—" : formatMad(posRevenue)}
          hint={posMargin != null ? `Marge ${formatMad(posMargin)}` : "Caisse POS"}
          tone="primary"
        />
        <Kpi label="Stock OK" value={String(optimalCount)} hint="Au-dessus du seuil" tone="emerald" />
        <Kpi label="Stock bas" value={String(kpis?.lowStockCount ?? "—")} hint="Sous le seuil" />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {kpis?.outOfStockCount ? (
          <button
            type="button"
            onClick={() => onAlert(alert === "OUT" ? "" : "OUT")}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] font-semibold",
              alert === "OUT" ? "bg-red-100 text-red-800" : "bg-red-50 text-red-700",
            )}
          >
            {kpis.outOfStockCount} rupture{kpis.outOfStockCount > 1 ? "s" : ""}
          </button>
        ) : null}
        {openOrders > 0 ? (
          <Link
            href="/purchases/"
            className="inline-flex shrink-0 items-center rounded-full bg-[#FFDEA4] px-3 py-1.5 text-[11px] font-semibold text-[#7B5900]"
          >
            {openOrders} commande{openOrders > 1 ? "s" : ""}
          </Link>
        ) : null}
        {lowMarginCount > 0 && !financeHidden ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#FCE9F4] px-3 py-1.5 text-[11px] font-semibold text-ink/60">
            {lowMarginCount} marge{lowMarginCount > 1 ? "s" : ""} &lt; 25 %
          </span>
        ) : null}
      </div>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          ref={searchRef}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher produit, SKU, marque…"
          className="h-12 w-full rounded-xl bg-white pl-11 pr-11 text-sm text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          aria-label="Filtrer"
          onClick={() => searchRef.current?.focus()}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink/45"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Pill active href="/products/">
          Catalogue ({catalogCount})
        </Pill>
        <LinkPill href="/purchases/">Achats ({openOrders})</LinkPill>
        <LinkPill href="/suppliers/">Fournisseurs ({supplierCount})</LinkPill>
        <LinkPill href="/stock/">Mouvements</LinkPill>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Pill active={category === ""} onClick={() => onCategory("")}>
          Tous ({catalogCount})
        </Pill>
        {categoryCounts.map(([c, n]) => (
          <Pill key={c} active={category === c} onClick={() => onCategory(c)}>
            {PRODUCT_CATEGORY_LABEL[c]} ({n})
          </Pill>
        ))}
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Pill active={usage === "all"} onClick={() => onUsage("all")}>
          Tous usages
        </Pill>
        <Pill active={usage === "sellable"} onClick={() => onUsage("sellable")}>
          Revente
        </Pill>
        <Pill active={usage === "consumable"} onClick={() => onUsage("consumable")}>
          Cabine
        </Pill>
        <Pill active={usage === "hybrid"} onClick={() => onUsage("hybrid")}>
          Hybride
        </Pill>
        <Pill active={alert === "LOW"} onClick={() => onAlert(alert === "LOW" ? "" : "LOW")}>
          Stock bas
        </Pill>
        <Pill active={alert === "OUT"} onClick={() => onAlert(alert === "OUT" ? "" : "OUT")}>
          Rupture
        </Pill>
      </div>

      <div className="flex items-center rounded-xl bg-[#F6E3EF] p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold",
            view === "list" ? "bg-white text-ink shadow-sm" : "text-ink/45",
          )}
        >
          <LayoutList size={16} className="text-primary" />
          Liste ({filtered.length})
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && setView("focus")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg py-2 text-[13px] font-semibold disabled:opacity-40",
            view === "focus" ? "bg-white text-ink shadow-sm" : "text-ink/45",
          )}
        >
          Fiche : {focusName}
        </button>
      </div>

      {view === "list" ? (
        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink/40">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/45">Aucun produit trouvé.</p>
          ) : (
            filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                selected={p.id === selectedId}
                financeHidden={financeHidden}
                canWrite={canWrite}
                onOpen={() => openFocus(p.id)}
                onAdjust={onAdjust}
              />
            ))
          )}
        </div>
      ) : selected ? (
        <ProductFocusPanel
          productId={selected.id}
          fallback={selected}
          insight={insight}
          canWrite={canWrite}
          financeHidden={financeHidden}
          onEdit={() => onEdit(selected.id)}
          onToggle={() => onToggle(selected)}
          onAdjust={onAdjust}
        />
      ) : null}
    </div>
  );
}

function ProductCard({
  product: p,
  selected,
  financeHidden,
  canWrite,
  onOpen,
  onAdjust,
}: {
  product: ProductListItem;
  selected: boolean;
  financeHidden: boolean;
  canWrite: boolean;
  onOpen: () => void;
  onAdjust: () => void;
}) {
  const margin = productMargin(p);
  return (
    <article className={cn("rounded-xl bg-white p-3.5 shadow-sm", selected && "ring-1 ring-primary/25")}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <p className="truncate text-[16px] font-bold text-ink">{p.name}</p>
          <p className="truncate text-[12px] text-ink/50">
            {PRODUCT_CATEGORY_LABEL[p.category]} · {p.sku}
          </p>
        </button>
        <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", alertChipClass(p.alert))}>
          {STOCK_ALERT_LABEL[p.alert]}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px] text-ink/55">
        <span>
          {formatQty(p.stock, p.unit)} / min {p.minStock}
        </span>
        <span>{usageLabel(p)}</span>
      </div>
      {!financeHidden ? (
        <div className="mt-1 flex items-center justify-between text-[12px]">
          <span className="font-semibold text-ink">{p.salePrice != null ? formatMad(p.salePrice) : "—"}</span>
          <span className={cn("font-semibold", isLowMargin(p) ? "text-red-700" : "text-ink/45")}>
            {margin ? `${margin.pct.toFixed(0)} %` : "Consommable"}
          </span>
        </div>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#F0DDE9] text-[13px] font-semibold text-primary"
        >
          Voir la fiche
        </button>
        {canWrite && (p.alert === "OUT" || p.alert === "LOW") ? (
          <Link
            href="/purchases/"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-primary text-[13px] font-semibold text-white"
          >
            <ShoppingBag size={14} />
            Commander
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAdjust}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#FCE9F4] text-[13px] font-semibold text-ink"
          >
            Ajuster
          </button>
        )}
      </div>
    </article>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  tone?: "emerald" | "primary";
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-[20px] font-bold",
          tone === "emerald" ? "text-emerald-700" : tone === "primary" ? "text-primary" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink/45">{hint}</p>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  href,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  href?: string;
}) {
  const className = cn(
    "inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-[12px] font-semibold shadow-sm",
    active ? "bg-primary text-white" : "bg-white text-ink/55",
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function LinkPill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-ink/55 shadow-sm"
    >
      {children}
    </Link>
  );
}
