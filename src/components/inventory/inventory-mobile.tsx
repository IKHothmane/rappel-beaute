"use client";

import Link from "next/link";
import { type ReactNode, type RefObject, useState } from "react";
import { ChevronDown, History, Package, Search, SlidersHorizontal, Sparkles, Truck } from "lucide-react";
import {
  alertBarClass,
  alertChipClass,
  formatMovementTime,
  STOCK_ALERT_LABEL,
  stockFillPercent,
  usageLabel,
} from "@/components/inventory/product-helpers";
import { movementQtyLabel, movementTone } from "@/components/inventory/stock-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatQty, MOVEMENT_TYPE_LABEL } from "@/modules/inventory/service";
import type {
  InventoryMovementItem,
  ProductCategory,
  ProductListItem,
  StockAlertLevel,
  StockKpis,
} from "@/types/inventory";
import { PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

export type StockTab = "niveaux" | "alertes" | "mouvements" | "inventaire";
export type UsageFilter = "all" | "sellable" | "consumable";

type InventoryMobileProps = {
  orgName: string;
  catalogCount: number;
  kpis: StockKpis | null;
  optimalCount: number;
  openOrders: number;
  canWrite: boolean;
  financeHidden: boolean;
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
  tab: StockTab;
  onTab: (t: StockTab) => void;
  filtered: ProductListItem[];
  movements: InventoryMovementItem[];
  movementTotal: number;
  loading: boolean;
  latestByProduct: Map<string, InventoryMovementItem>;
  onQuickIn: (id: string) => void;
  onQuickOut: (id: string) => void;
  onAdjust: (id: string) => void;
  onReceipt: () => void;
  onInventory: () => void;
  showPurchases: boolean;
};

export function InventoryMobile({
  orgName,
  catalogCount,
  kpis,
  optimalCount,
  openOrders,
  canWrite,
  financeHidden,
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
  tab,
  onTab,
  filtered,
  movements,
  movementTotal,
  loading,
  latestByProduct,
  onQuickIn,
  onQuickOut,
  onAdjust,
  onReceipt,
  onInventory,
  showPurchases,
}: InventoryMobileProps) {
  const out = kpis?.outOfStockCount ?? 0;
  const low = kpis?.lowStockCount ?? 0;
  const total = Math.max(catalogCount, 1);
  const okPct = (optimalCount / total) * 100;
  const lowPct = (low / total) * 100;
  const outPct = (out / total) * 100;

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
            Stock & mouvements
          </h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            {catalogCount} {catalogCount > 1 ? "références" : "référence"} · {orgName || "Votre institut"}
          </p>
        </div>
        {canWrite ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onReceipt}
              className="inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-[#F0DDE9] text-[12px] font-semibold text-ink"
            >
              <Truck size={16} className="text-[#7B5900]" />
              Entrée BL
            </button>
            <button
              type="button"
              onClick={() => onAdjust("")}
              className="inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-[#F0DDE9] text-[12px] font-semibold text-ink"
            >
              <SlidersHorizontal size={16} />
              Ajustement
            </button>
            <button
              type="button"
              onClick={onInventory}
              className="inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-primary text-[12px] font-semibold text-white shadow-md"
            >
              Inventaire
            </button>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Kpi label="Catalogue" value={String(catalogCount)} hint="Références actives" />
        {!financeHidden ? (
          <Kpi
            label="Valeur stock"
            value={kpis ? formatMad(kpis.totalStockValue) : "—"}
            hint="Prix d’achat × stock"
            tone="gold"
          />
        ) : (
          <Kpi label="Stock OK" value={String(optimalCount)} hint="Au-dessus du seuil" tone="emerald" />
        )}
        <div className="col-span-2 rounded-xl bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink/40">
            <span>Disponibilité</span>
            <span className="normal-case tracking-normal text-ink">
              {optimalCount} conforme{optimalCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[#F0DDE9]">
            <div className="bg-emerald-600" style={{ width: `${okPct}%` }} />
            <div className="bg-[#F0BF5C]" style={{ width: `${lowPct}%` }} />
            <div className="bg-primary" style={{ width: `${outPct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 text-center">
            <button type="button" onClick={() => onAlert("")} className="flex flex-col items-center">
              <span className="text-lg font-bold text-ink">{optimalCount}</span>
              <span className="text-[11px] text-ink/45">Optimal</span>
            </button>
            <button
              type="button"
              onClick={() => onAlert(alert === "LOW" ? "" : "LOW")}
              className="flex flex-col items-center"
            >
              <span className="text-lg font-bold text-[#7B5900]">{low}</span>
              <span className="text-[11px] text-ink/45">Bas</span>
            </button>
            <button
              type="button"
              onClick={() => onAlert(alert === "OUT" ? "" : "OUT")}
              className="flex flex-col items-center"
            >
              <span className="text-lg font-bold text-primary">{out}</span>
              <span className="text-[11px] text-ink/45">Rupture</span>
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[#F6E3EF] p-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Journal réel</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/75">{insight}</p>
            {showPurchases && openOrders > 0 ? (
              <Link href="/purchases/" className="mt-2 inline-flex text-[12px] font-semibold text-primary">
                {openOrders > 1 ? `${openOrders} commandes en attente →` : `${openOrders} commande en attente →`}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Pill active={tab === "niveaux"} onClick={() => onTab("niveaux")}>
          Niveaux ({catalogCount})
        </Pill>
        <Pill active={tab === "alertes"} onClick={() => onTab("alertes")}>
          Alertes ({out + low})
        </Pill>
        <Pill active={tab === "mouvements"} onClick={() => onTab("mouvements")}>
          Mouvements ({movementTotal})
        </Pill>
        <Pill active={tab === "inventaire"} onClick={() => onTab("inventaire")}>
          Inventaire
        </Pill>
      </div>

      {tab !== "mouvements" && tab !== "inventaire" ? (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher produit, SKU…"
              className="h-12 w-full rounded-xl bg-white pl-11 pr-11 text-sm text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Pill active={category === ""} onClick={() => onCategory("")}>
              Toutes
            </Pill>
            {(Object.keys(PRODUCT_CATEGORY_LABEL) as ProductCategory[]).map((c) => (
              <Pill key={c} active={category === c} onClick={() => onCategory(c)}>
                {PRODUCT_CATEGORY_LABEL[c]}
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
          </div>
        </>
      ) : null}

      {tab === "mouvements" ? (
        <MovementList movements={movements} loading={loading} />
      ) : tab === "inventaire" ? null : loading ? (
        <p className="py-10 text-center text-sm text-ink/40">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink/45">Aucune référence.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">État du stock</h3>
            <span className="text-[11px] text-ink/40">
              {filtered.length} affiché{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          {filtered.map((p) => (
            <StockCard
              key={p.id}
              product={p}
              last={latestByProduct.get(p.id)}
              financeHidden={financeHidden}
              canWrite={canWrite}
              onIn={() => onQuickIn(p.id)}
              onOut={() => onQuickOut(p.id)}
              onAdjust={() => onAdjust(p.id)}
            />
          ))}
        </div>
      )}

      {tab !== "mouvements" ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <History size={16} className="text-primary" />
            <h3 className="text-[15px] font-bold text-ink">Flux récents</h3>
          </div>
          <MovementList movements={movements.slice(0, 5)} loading={false} compact />
        </section>
      ) : null}
    </div>
  );
}

function StockCard({
  product: p,
  last,
  financeHidden,
  canWrite,
  onIn,
  onOut,
  onAdjust,
}: {
  product: ProductListItem;
  last?: InventoryMovementItem;
  financeHidden: boolean;
  canWrite: boolean;
  onIn: () => void;
  onOut: () => void;
  onAdjust: () => void;
}) {
  const fill = stockFillPercent(p);
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FCE9F4] text-primary">
          <Package size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", alertChipClass(p.alert))}>
              {STOCK_ALERT_LABEL[p.alert]}
            </span>
            <span className="text-[13px] font-bold text-ink">{formatQty(p.stock, p.unit)}</span>
          </div>
          <h4 className="mt-0.5 truncate text-[14px] font-bold text-ink">{p.name}</h4>
          <p className="truncate text-[12px] text-ink/45">
            {p.sku} · {PRODUCT_CATEGORY_LABEL[p.category]} · {usageLabel(p)}
          </p>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[10px] font-semibold text-ink/40">
          <span>Min {p.minStock}</span>
          <span>Actuel {p.stock}</span>
          <span>{p.maxStock != null ? `Max ${p.maxStock}` : "—"}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
          <div className={cn("h-full rounded-full", alertBarClass(p.alert))} style={{ width: `${fill}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[11px] text-ink/50">
          {!financeHidden ? formatMad(p.stockValue) : last ? formatMovementTime(last.createdAt) : "—"}
        </span>
        {canWrite ? (
          p.alert === "OUT" ? (
            <Link
              href="/purchases/"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-[11px] font-bold text-white"
            >
              Commander
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOut}
                className="inline-flex h-8 items-center rounded-lg bg-[#FCE9F4] px-2.5 text-[11px] font-bold text-ink"
              >
                Sortie
              </button>
              <button
                type="button"
                onClick={onIn}
                className="inline-flex h-8 items-center rounded-lg bg-[#FCE9F4] px-2.5 text-[11px] font-bold text-ink"
              >
                Entrée
              </button>
              <button
                type="button"
                onClick={onAdjust}
                className="inline-flex h-8 items-center rounded-lg bg-[#FCE9F4] px-2 text-[11px] font-bold text-ink"
              >
                Ajuster
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function MovementList({
  movements,
  loading,
  compact,
}: {
  movements: InventoryMovementItem[];
  loading: boolean;
  compact?: boolean;
}) {
  if (loading) return <p className="py-8 text-center text-sm text-ink/40">Chargement…</p>;
  if (movements.length === 0) {
    return <p className="rounded-xl bg-white p-6 text-center text-sm text-ink/45 shadow-sm">Aucun mouvement.</p>;
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm">
      {movements.map((m) => {
        const tone = movementTone(m.type);
        return (
          <div
            key={m.id}
            className={cn(
              "flex items-start justify-between gap-2",
              !compact && "border-b border-[#F0DDE9] pb-2.5 last:border-0 last:pb-0",
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  tone === "in" && "bg-emerald-50 text-emerald-700",
                  tone === "loss" && "bg-red-50 text-red-700",
                  tone === "care" && "bg-[#FCE9F4] text-primary",
                  tone === "sale" && "bg-[#FFDEA4]/40 text-[#7B5900]",
                  tone === "out" && "bg-[#FCE9F4] text-ink/60",
                )}
              >
                <History size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-ink">{MOVEMENT_TYPE_LABEL[m.type]}</p>
                <p className="truncate text-[12px] text-ink/45">
                  {m.productName}
                  {m.userName ? ` · ${m.userName}` : ""}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className={cn("text-[13px] font-bold", m.quantity < 0 ? "text-primary" : "text-emerald-700")}>
                {movementQtyLabel(m)}
              </span>
              <span className="block text-[10px] text-ink/40">{formatMovementTime(m.createdAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap",
        active ? "bg-primary text-white shadow-sm" : "bg-[#FCE9F4] text-ink/55",
      )}
    >
      {children}
    </button>
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
  hint: string;
  tone?: "gold" | "emerald";
}) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-3.5 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</span>
      <span
        className={cn(
          "mt-1 text-[22px] font-bold leading-none text-ink",
          tone === "gold" && "text-[#7B5900]",
          tone === "emerald" && "text-emerald-700",
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-[11px] text-ink/45">{hint}</span>
    </div>
  );
}

export function InventoryAccordion({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm lg:hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between p-3.5 text-left">
        <span>
          <span className="block text-[15px] font-bold text-ink">{title}</span>
          <span className="text-[11px] text-ink/45">{hint}</span>
        </span>
        <ChevronDown size={18} className={cn("text-ink/40 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="px-3.5 pb-3.5">{children}</div> : null}
    </div>
  );
}
