"use client";
import { MetricCard } from "@/components/ui/metric-card";

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
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5 rb-metric-row">
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
  return <MetricCard title={label} value={value} icon={<Icon />} onClick={onClick}></MetricCard>;
}
