"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  alertBarClass,
  alertChipClass,
  productMargin,
  STOCK_ALERT_LABEL,
  stockFillPercent,
  usageLabel,
} from "@/components/inventory/product-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatQty } from "@/modules/inventory/service";
import type { ProductListItem } from "@/types/inventory";
import { PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

const CATEGORY_TONE: Record<string, string> = {
  PROFESSIONNEL: "bg-[#EEE3FA] text-[#793EB0]",
  VENTE: "bg-[#FCE3EB] text-[#AD1451]",
  CONSOMMABLE: "bg-[#E1F5E9] text-[#148452]",
  MATERIEL: "bg-[#E8F1FF] text-[#2F5FBF]",
  ACCESSOIRE: "bg-[#FFF0DA] text-[#C48822]",
  JETABLE: "bg-[#FFE8F0] text-[#B42348]",
};

type Props = {
  product: ProductListItem;
  selected: boolean;
  canWrite: boolean;
  financeHidden: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMenu: () => void;
  menu: ReactNode;
};

export function ProductPremiumCard({
  product,
  selected,
  canWrite,
  financeHidden,
  menuOpen,
  onSelect,
  onMenu,
  menu,
}: Props) {
  const margin = productMargin(product);

  return (
    <article
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[22px] border bg-white shadow-[0_8px_24px_rgba(75,18,45,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
        selected
          ? "border-[#AC0E4C] bg-[#FFF0F6] ring-2 ring-[#AC0E4C]/25"
          : "border-[#F0DDE4]",
      )}
    >
      <div className="relative space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold",
                alertChipClass(product.alert),
              )}
            >
              {STOCK_ALERT_LABEL[product.alert]}
            </span>
            <h3 className="mt-2 truncate text-[15px] font-bold text-[#41192D]">{product.name}</h3>
            <p className="mt-1 font-mono text-[11px] text-[#846A79]">
              {product.sku}
              {product.brand ? ` · ${product.brand}` : ""}
            </p>
          </div>
          {canWrite ? (
            <button
              type="button"
              aria-label="Actions"
              onClick={(e) => {
                e.stopPropagation();
                onMenu();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#F0DDE4] bg-white text-[#49192E] shadow-sm hover:bg-[#FFF7FA]"
            >
              <MoreHorizontal size={16} />
            </button>
          ) : null}
        </div>
        {menuOpen ? menu : null}

        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              CATEGORY_TONE[product.category] ?? "bg-[#FFF0F6] text-[#74334E]",
            )}
          >
            {PRODUCT_CATEGORY_LABEL[product.category]}
          </span>
          <span className="rounded-full bg-[#FFF0F6] px-2.5 py-1 text-[11px] font-semibold text-[#AC0E4C]">
            {usageLabel(product)}
          </span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#43182D]">{formatQty(product.stock, product.unit)}</span>
            <span className="text-[#846A79]">min {product.minStock}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#F0DDE9]">
            <div
              className={cn("h-full rounded-full", alertBarClass(product.alert))}
              style={{ width: `${stockFillPercent(product)}%` }}
            />
          </div>
        </div>

        {!financeHidden ? (
          <div className="grid grid-cols-3 gap-2 border-t border-[#F2E5EA] pt-3 text-center">
            <div>
              <p className="text-[10px] text-[#846A79]">Achat</p>
              <p className="text-xs font-bold text-[#43182D]">{formatMad(product.purchasePrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#846A79]">Vente</p>
              <p className="text-xs font-bold text-[#43182D]">
                {product.salePrice != null ? formatMad(product.salePrice) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#846A79]">Marge</p>
              <p
                className={cn(
                  "text-xs font-bold",
                  margin && margin.pct < 25 ? "text-red-700" : "text-emerald-700",
                )}
              >
                {margin ? `${margin.pct.toFixed(0)} %` : "—"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function categoryToneClass(category: string) {
  return CATEGORY_TONE[category] ?? "bg-[#FFF0F6] text-[#74334E]";
}
