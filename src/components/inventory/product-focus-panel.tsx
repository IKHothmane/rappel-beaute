"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Pencil, Plus, ShoppingBag, Sparkles } from "lucide-react";
import {
  alertChipClass,
  formatMovementTime,
  productMargin,
  STOCK_ALERT_LABEL,
  stockFillPercent,
  usageLabel,
} from "@/components/inventory/product-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatQty, getProduct, MOVEMENT_TYPE_LABEL } from "@/modules/inventory/service";
import type { ProductDetail, ProductListItem } from "@/types/inventory";
import { PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

type ProductFocusPanelProps = {
  productId: string;
  fallback: ProductListItem;
  insight: string;
  canWrite: boolean;
  financeHidden: boolean;
  onEdit: () => void;
  onAdjust: () => void;
};

export function ProductFocusPanel({
  productId,
  fallback,
  insight,
  canWrite,
  financeHidden,
  onEdit,
  onAdjust,
}: ProductFocusPanelProps) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProductDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    getProduct(productId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    productId,
    fallback.stock,
    fallback.alert,
    fallback.name,
    fallback.purchasePrice,
    fallback.salePrice,
    fallback.minStock,
    fallback.active,
  ]);

  const product = detail ?? fallback;
  const margin = productMargin(product);
  const fill = stockFillPercent(product);
  const preferred = (detail?.suppliers ?? []).slice().sort((a, b) => Number(b.preferred) - Number(a.preferred));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Fiche produit</p>
            <h3 className="mt-0.5 text-[18px] font-bold leading-snug text-ink">{product.name}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-ink/45">
              {product.sku}
              {product.brand ? ` · ${product.brand}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-semibold text-ink/55">
                {PRODUCT_CATEGORY_LABEL[product.category]}
              </span>
              <span className="rounded-full bg-[#FFEFF8] px-2 py-0.5 text-[11px] font-semibold text-primary">
                {usageLabel(product)}
              </span>
            </div>
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={onEdit}
              title="Modifier"
              className="rounded-lg bg-[#FCE9F4] p-2 text-ink/50 hover:text-primary"
            >
              <Pencil size={16} />
            </button>
          ) : null}
        </div>

        <span className={cn("inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-bold", alertChipClass(product.alert))}>
          {STOCK_ALERT_LABEL[product.alert]}
        </span>

        <div className="rounded-xl bg-[#FFEFF8] p-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase text-ink/40">Stock disponible</p>
              <p className="font-display text-[28px] font-extrabold leading-8 text-ink">
                {formatQty(product.stock, product.unit)}
              </p>
            </div>
            <p className="text-right text-[12px] text-ink/50">
              Seuil min {formatQty(product.minStock, product.unit)}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
            <div
              className={cn("h-full rounded-full", product.alert === "OK" ? "bg-emerald-600" : "bg-[#F0BF5C]")}
              style={{ width: `${fill}%` }}
            />
          </div>
          {canWrite ? (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={onAdjust}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-white text-[11px] font-semibold text-ink shadow-sm"
              >
                <Plus size={13} />
                Entrée
              </button>
              <button
                type="button"
                onClick={onAdjust}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-white text-[11px] font-semibold text-ink shadow-sm"
              >
                <Minus size={13} />
                Sortie
              </button>
              <Link
                href="/purchases/"
                className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-primary text-[11px] font-bold text-white"
              >
                <ShoppingBag size={13} />
                Commande
              </Link>
            </div>
          ) : (
            <Link
              href="/stock/"
              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-white text-[12px] font-semibold text-primary shadow-sm"
            >
              Voir les mouvements
            </Link>
          )}
        </div>

        {!financeHidden ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[#FFEFF8] p-2">
              <span className="block text-[11px] text-ink/40">Achat</span>
              <span className="text-[13px] font-bold text-ink">{formatMad(product.purchasePrice)}</span>
            </div>
            <div className="rounded-lg bg-[#FFEFF8] p-2">
              <span className="block text-[11px] text-ink/40">Vente</span>
              <span className="text-[13px] font-bold text-ink">
                {product.salePrice != null ? formatMad(product.salePrice) : "—"}
              </span>
            </div>
            <div className="rounded-lg bg-[#FFEFF8] p-2">
              <span className="block text-[11px] text-ink/40">Marge</span>
              <span className={cn("text-[13px] font-bold", margin && margin.pct < 25 ? "text-red-700" : "text-emerald-700")}>
                {margin ? `${margin.pct.toFixed(0)} %` : "—"}
              </span>
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/40">
            Prestations liées
          </p>
          {loading && !detail ? (
            <p className="text-[12px] text-ink/40">Chargement…</p>
          ) : (detail?.services.length ?? 0) === 0 && product.serviceCount === 0 ? (
            <p className="text-[12px] text-ink/45">Aucune prestation ne consomme ce produit.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {(detail?.services ?? []).slice(0, 6).map((s) => (
                <div key={s.serviceId} className="flex items-center justify-between rounded-lg bg-[#FFEFF8] px-2.5 py-2 text-[12px]">
                  <span className="font-semibold text-ink">{s.serviceName}</span>
                  <span className="text-ink/45">
                    {s.quantity} {s.unit}
                  </span>
                </div>
              ))}
              {!detail && product.serviceCount > 0 ? (
                <p className="text-[12px] text-ink/50">{product.serviceCount} prestation(s) liée(s)</p>
              ) : null}
            </div>
          )}
        </div>

        {preferred.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/40">
              Fournisseurs
            </p>
            <div className="flex flex-col gap-1.5">
              {preferred.slice(0, 4).map((s) => (
                <Link
                  key={s.supplierId}
                  href={`/suppliers/${s.supplierId}/`}
                  className="flex items-center justify-between rounded-lg bg-[#FFEFF8] px-2.5 py-2 text-[12px] hover:bg-[#FCE9F4]"
                >
                  <span className="font-semibold text-ink">
                    {s.preferred ? "★ " : ""}
                    {s.supplierName}
                  </span>
                  {!financeHidden ? (
                    <span className="text-primary">{formatMad(s.purchasePrice)}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ) : product.supplierName ? (
          <p className="text-[12px] text-ink/55">Fournisseur : {product.supplierName}</p>
        ) : null}

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/40">
            Derniers mouvements
          </p>
          {loading && !detail ? (
            <p className="text-[12px] text-ink/40">Chargement…</p>
          ) : (detail?.recentMovements.length ?? 0) === 0 ? (
            <p className="text-[12px] text-ink/45">Aucun mouvement enregistré.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {detail!.recentMovements.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-[#FFEFF8] px-2.5 py-2 text-[12px]">
                  <div>
                    <p className="font-semibold text-ink">{MOVEMENT_TYPE_LABEL[m.type]}</p>
                    <p className="text-[11px] text-ink/45">
                      {formatMovementTime(m.createdAt)}
                      {m.userName ? ` · ${m.userName}` : ""}
                    </p>
                  </div>
                  <span className={cn("font-bold", m.quantity < 0 ? "text-red-700" : "text-emerald-700")}>
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-[#FFEFF8] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Sparkles size={14} />
            Insight catalogue
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink">{insight}</p>
        </div>

        <Link
          href="/stock/"
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#FCE9F4] text-[13px] font-semibold text-ink"
        >
          Stock
        </Link>
      </div>
    </div>
  );
}
