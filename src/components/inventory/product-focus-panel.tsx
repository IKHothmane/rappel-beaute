"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Pencil, Plus, ShoppingBag } from "lucide-react";
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
  insight?: string;
  canWrite: boolean;
  financeHidden: boolean;
  onEdit: () => void;
  onIn: () => void;
  onOut: () => void;
  stockBusy?: boolean;
};

export function ProductFocusPanel({
  productId,
  fallback,
  canWrite,
  financeHidden,
  onEdit,
  onIn,
  onOut,
  stockBusy = false,
}: ProductFocusPanelProps) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProductDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
  }, [productId]);

  const product = detail ?? fallback;
  const stockNow = fallback.stock;
  const alertNow = fallback.alert;
  const margin = productMargin(product);
  const fill = stockFillPercent({ ...product, stock: stockNow, alert: alertNow });
  const preferred = (detail?.suppliers ?? []).slice().sort((a, b) => Number(b.preferred) - Number(a.preferred));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col overflow-hidden rounded-[22px] border border-[#F0DDE4] bg-white shadow-lg">
        <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#AC0E4C]">Fiche produit</p>
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-[11px] font-bold",
                  alertChipClass(alertNow),
                )}
              >
                {STOCK_ALERT_LABEL[alertNow]}
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold leading-snug text-[#54112F]">{product.name}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-[#846A79]">
              {product.sku}
              {product.brand ? ` · ${product.brand}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[#FFF0F6] px-2 py-0.5 text-[11px] font-semibold text-[#74334E]">
                {PRODUCT_CATEGORY_LABEL[product.category]}
              </span>
              <span className="rounded-full bg-[#FFE8F1] px-2 py-0.5 text-[11px] font-semibold text-[#AC0E4C]">
                {usageLabel(product)}
              </span>
            </div>
          </div>
          {canWrite ? (
            <button
              type="button"
              onClick={onEdit}
              title="Modifier"
              className="rounded-xl border border-[#EAD4DE] bg-white p-2 text-[#765164] hover:bg-[#FFF0F6] hover:text-[#AC0E4C]"
            >
              <Pencil size={16} />
            </button>
          ) : null}
        </div>

        <div className="rounded-2xl bg-[#FFF0F6] p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase text-[#846A79]">Stock disponible</p>
              <p className="font-serif text-[28px] font-extrabold leading-8 text-[#43182D]">
                {formatQty(stockNow, product.unit)}
              </p>
            </div>
            <p className="text-right text-[12px] text-[#846A79]">
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
                onClick={onIn}
                disabled={stockBusy}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[#EAD4DE] bg-white text-[11px] font-semibold text-[#54112F] disabled:opacity-50"
              >
                <Plus size={13} />
                Entrée
              </button>
              <button
                type="button"
                onClick={onOut}
                disabled={stockBusy}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[#EAD4DE] bg-white text-[11px] font-semibold text-[#54112F] disabled:opacity-50"
              >
                <Minus size={13} />
                Sortie
              </button>
              <Link
                href="/purchases/"
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-[#AC0E4C] text-[11px] font-bold text-white"
              >
                <ShoppingBag size={13} />
                Commande
              </Link>
            </div>
          ) : (
            <Link
              href="/stock/"
              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#EAD4DE] bg-white text-[12px] font-semibold text-[#AC0E4C]"
            >
              Voir les mouvements
            </Link>
          )}
        </div>

        {!financeHidden ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-[#FFF0F6] p-3">
              <span className="block text-[11px] text-[#846A79]">Achat</span>
              <span className="text-[13px] font-bold text-[#43182D]">{formatMad(product.purchasePrice)}</span>
            </div>
            <div className="rounded-2xl bg-[#FFF0F6] p-3">
              <span className="block text-[11px] text-[#846A79]">Vente</span>
              <span className="text-[13px] font-bold text-[#43182D]">
                {product.salePrice != null ? formatMad(product.salePrice) : "—"}
              </span>
            </div>
            <div className="rounded-2xl bg-[#FFF0F6] p-3">
              <span className="block text-[11px] text-[#846A79]">Marge</span>
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

        <Link
          href="/stock/"
          className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#EAD4DE] bg-white text-[13px] font-semibold text-[#54112F]"
        >
          Stock
        </Link>
        </div>
      </div>
    </div>
  );
}
