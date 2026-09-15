"use client";

import Link from "next/link";
import { Barcode, Search, ShoppingBag, UserRound } from "lucide-react";
import {
  categoryCounts,
  filterPosCatalog,
  productStockState,
} from "@/components/pos/pos-helpers";
import { cn } from "@/lib/utils";
import { formatMad } from "@/modules/finance/service";
import { PRODUCT_UNIT_LABEL, type ProductUnit } from "@/types/inventory";
import type { PosProductItem } from "@/types/pos";

type Customer = { id: string; name: string; phone: string };

type Props = {
  orgName: string;
  cashOpen: boolean;
  cashHint: string;
  kpis: { revenue: number; count: number; average: number };
  search: string;
  onSearch: (v: string) => void;
  onSearchSubmit: () => void;
  category: string;
  onCategory: (c: string) => void;
  products: PosProductItem[];
  catalog: PosProductItem[];
  loading: boolean;
  customer: Customer | null;
  customerQ: string;
  onCustomerQ: (v: string) => void;
  customerHits: Customer[];
  onPickCustomer: (c: Customer) => void;
  onAnonymous: () => void;
  loyaltyLine: string | null;
  cartCount: number;
  total: number;
  onAdd: (p: PosProductItem) => void;
  onOpenCart: () => void;
};

export function PosMobile({
  orgName,
  cashOpen,
  cashHint,
  kpis,
  search,
  onSearch,
  onSearchSubmit,
  category,
  onCategory,
  products,
  catalog,
  loading,
  customer,
  customerQ,
  onCustomerQ,
  customerHits,
  onPickCustomer,
  onAnonymous,
  loyaltyLine,
  cartCount,
  total,
  onAdd,
  onOpenCart,
}: Props) {
  const counts = categoryCounts(products);
  const visible = filterPosCatalog(catalog.length ? catalog : products, search, category);
  const retail = visible.filter((p) => p.category === "VENTE");
  const other = visible.filter((p) => p.category !== "VENTE");

  return (
    <div className="space-y-4 pb-8 lg:hidden">
      <section className="rounded-xl bg-[#FFEFF8] p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-ink">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", cashOpen ? "bg-emerald-600" : "bg-ink/30")} />
            <span className="truncate">{cashHint}</span>
          </span>
          <span className="shrink-0 text-primary">POS</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <KpiMini label="CA jour" value={formatMad(kpis.revenue)} />
          <KpiMini label="Ventes" value={String(kpis.count)} />
          <KpiMini label="Panier moy." value={kpis.count ? formatMad(kpis.average) : "—"} />
        </div>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <Search className="absolute left-3 top-3 h-5 w-5 text-ink/35" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Soin, SKU, cosmétique…"
            className="h-11 w-full rounded-lg bg-white pl-10 pr-3 text-[13px] shadow-sm outline-none"
          />
        </form>
      </section>

      <section className="rounded-xl bg-white p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Cliente</p>
          {customer ? (
            <button type="button" className="text-[12px] font-semibold text-ink/50" onClick={onAnonymous}>
              Anonyme
            </button>
          ) : null}
        </div>
        {customer ? (
          <div className="rounded-lg bg-[#FFEFF8] p-2">
            <p className="text-[16px] font-bold">{customer.name}</p>
            {customer.phone ? <p className="text-[12px] text-ink/55">{customer.phone}</p> : null}
            {loyaltyLine ? <p className="mt-1 text-[12px] text-[#7B5900]">{loyaltyLine}</p> : null}
          </div>
        ) : (
          <div className="relative">
            <UserRound className="absolute left-3 top-3 h-4 w-4 text-ink/35" />
            <input
              value={customerQ}
              onChange={(e) => onCustomerQ(e.target.value)}
              placeholder="Rechercher une cliente…"
              className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-9 pr-3 text-[13px] outline-none"
            />
            {customerHits.length > 0 ? (
              <ul className="mt-1 overflow-hidden rounded-lg border border-[#F0DDE9] bg-white text-[13px]">
                {customerHits.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-[#FFEFF8]"
                      onClick={() => onPickCustomer(c)}
                    >
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <CatPill active={!category} onClick={() => onCategory("")} label={`Tous ${products.length}`} />
        {counts.map((c) => (
          <CatPill
            key={c.category}
            active={category === c.category}
            onClick={() => onCategory(c.category)}
            label={`${c.label} ${c.count}`}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-center text-[13px] text-ink/50">Chargement…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-center text-[13px] text-ink/50 shadow-sm">
          Aucun produit vendable. Activez un prix de vente sur la fiche produit.
        </p>
      ) : (
        <>
          {other.length > 0 ? (
            <CatalogBlock title="Catalogue" items={other} onAdd={onAdd} />
          ) : null}
          {retail.length > 0 ? (
            <CatalogBlock title="Revente comptoir" items={retail} onAdd={onAdd} />
          ) : null}
        </>
      )}

      <section className="rounded-2xl bg-[#F0DDE9] p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
              {cartCount}
            </span>
            <div>
              <p className="text-[18px] font-bold">Ticket en cours</p>
              <p className="text-[11px] text-ink/50">{orgName}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCart}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-bold text-white"
        >
          <Barcode className="h-5 w-5" />
          Encaisser · {formatMad(total)}
        </button>
        <Link href="/cash-register/" className="mt-2 block text-center text-[12px] font-semibold text-primary">
          Caisse & registre
        </Link>
      </section>
    </div>
  );
}

function CatalogBlock({
  title,
  items,
  onAdd,
}: {
  title: string;
  items: PosProductItem[];
  onAdd: (p: PosProductItem) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="text-[18px] font-bold">{title}</h2>
      </div>
      <div className="space-y-1.5">
        {items.map((p) => {
          const state = productStockState(p);
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 shadow-sm",
                state === "out" && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{p.name}</p>
                <p className="text-[12px] text-ink/50">
                  {p.brand || PRODUCT_UNIT_LABEL[p.unit as ProductUnit] || p.sku}
                  {" · "}
                  <span
                    className={cn(
                      state === "out" && "font-semibold text-[#BA1A1A]",
                      state === "low" && "font-semibold text-amber-700",
                    )}
                  >
                    {state === "out" ? "Hors stock" : `Stock ${p.stock}`}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[16px] font-bold">{formatMad(p.salePrice)}</span>
                <button
                  type="button"
                  disabled={state === "out"}
                  onClick={() => onAdd(p)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-white disabled:bg-[#F0DDE9] disabled:text-ink/40"
                >
                  {state === "out" ? "Épuisé" : "Ajouter"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CatPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold",
        active ? "bg-primary text-white shadow-sm" : "bg-[#F0DDE9] text-ink",
      )}
    >
      {label}
    </button>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2 text-center shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
      <p className="mt-0.5 text-[15px] font-bold text-ink">{value}</p>
    </div>
  );
}
