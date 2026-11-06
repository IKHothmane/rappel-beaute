"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  InventoryPremiumCharts,
  type StockCategorySlice,
} from "@/components/inventory/inventory-premium-charts";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  stockValue: string | null;
  financeHidden?: boolean;
  categories: StockCategorySlice[];
  onLowStock: () => void;
  onOutOfStock: () => void;
};

export function InventoryPremiumHeader({
  total,
  inStock,
  lowStock,
  outOfStock,
  stockValue,
  financeHidden = false,
  categories,
  onLowStock,
  onOutOfStock,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Références" value={String(total)} icon={Package} tone="pink" />
        <StatCard label="En stock" value={String(inStock)} icon={CheckCircle2} tone="green" />
        <StatCard
          label="Sous le seuil"
          value={String(lowStock)}
          icon={AlertTriangle}
          tone="orange"
          onClick={onLowStock}
        />
        <StatCard
          label="Ruptures"
          value={String(outOfStock)}
          icon={XCircle}
          tone="red"
          onClick={onOutOfStock}
        />
        <StatCard
          label="Valeur du stock"
          value={stockValue ?? "—"}
          icon={TrendingUp}
          tone="purple"
        />
      </div>

      <InventoryPremiumCharts categories={categories} financeHidden={financeHidden} />
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  icon: typeof Package;
  tone: "pink" | "green" | "orange" | "red" | "purple";
  onClick?: () => void;
};

function StatCard({ label, value, icon: Icon, tone, onClick }: StatCardProps) {
  const colors = {
    pink: "bg-[#FFF0F5] text-[#A50F4A]",
    green: "bg-[#EAF8EF] text-[#16834B]",
    orange: "bg-[#FFF4E6] text-[#B77612]",
    red: "bg-[#FFF0F1] text-[#C42B4A]",
    purple: "bg-[#F4EDFF] text-[#7434B4]",
  };

  const content = (
    <>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors[tone]}`}
      >
        <Icon size={23} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#775B6A]">{label}</p>
        <p className="mt-1 break-words text-xl font-extrabold text-[#43182D]">{value}</p>
      </div>
    </>
  );

  const accents = {
    pink: "border-l-[#AD1451]",
    green: "border-l-[#16834B]",
    orange: "border-l-[#B77612]",
    red: "border-l-[#C42B4A]",
    purple: "border-l-[#7434B4]",
  };

  const className = cn(
    "flex min-h-[108px] items-center gap-3 rounded-[20px] border border-[#F0DDE4] border-l-4 bg-white p-4 text-left shadow-[0_6px_20px_rgba(72,20,43,0.05)] transition hover:-translate-y-0.5 hover:shadow-lg",
    accents[tone],
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
