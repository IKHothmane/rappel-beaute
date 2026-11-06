"use client";

import {
  Building2,
  Package,
  Plus,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

type Props = {
  supplierCount: number;
  activeCount: number;
  inactiveCount: number;
  productLinks: number;
  openOrders: number;
  monthPurchases: string | null;
  canWrite: boolean;
  topSuppliers: { name: string; total: number; orders: number }[];
  financeHidden?: boolean;
  onCreate: () => void;
};

const COLORS = ["#AC0E4C", "#E879A8", "#F2B8CE", "#C4A0D8", "#7EB89A"];

export function SuppliersPremiumHeader({
  supplierCount,
  activeCount,
  inactiveCount,
  productLinks,
  openOrders,
  monthPurchases,
  canWrite,
  topSuppliers,
  financeHidden = false,
  onCreate,
}: Props) {
  const statusData = [
    { name: "Actifs", value: activeCount },
    { name: "Archivés", value: inactiveCount },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <header
        className="relative flex min-h-[96px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/inventory-banner.webp")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Fournisseurs
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Répertoire partenaires, tarifs liés au catalogue et suivi des commandes.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={onCreate}
            className="relative z-10 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#AC0E4C] px-5 text-sm font-bold text-white shadow-md transition hover:bg-[#850F3C]"
          >
            <Plus size={17} />
            Nouveau fournisseur
          </button>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Fournisseurs" value={String(supplierCount)} icon={Building2} tone="pink" />
        <StatCard label="Actifs" value={String(activeCount)} icon={Building2} tone="green" />
        <StatCard label="Produits liés" value={String(productLinks)} icon={Package} tone="orange" />
        <StatCard label="Commandes en cours" value={String(openOrders)} icon={ShoppingCart} tone="red" />
        <StatCard
          label="Achats du mois"
          value={monthPurchases ?? "—"}
          icon={Wallet}
          tone="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-[22px] border border-[#F0DDE4] bg-white p-5 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-[#54112F]">Répartition du répertoire</h3>
          <p className="mt-1 text-xs text-[#846A79]">Actifs vs archivés</p>
          <div className="mt-2 h-48">
            {statusData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[#846A79]">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F0E3E6" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#F0DDE4] bg-white p-5 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-[#54112F]">Top fournisseurs</h3>
          <p className="mt-1 text-xs text-[#846A79]">
            {financeHidden ? "Volumes masqués selon vos permissions" : "Volume d’achats cumulé"}
          </p>
          <ul className="mt-4 space-y-3">
            {topSuppliers.length === 0 ? (
              <li className="text-sm text-[#846A79]">Aucun achat enregistré</li>
            ) : (
              topSuppliers.slice(0, 5).map((s, i) => (
                <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate font-semibold text-[#43182D]">{s.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-[#AC0E4C]">
                    {financeHidden ? `${s.orders} cmd` : s.total.toLocaleString("fr-MA") + " MAD"}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
  tone: "pink" | "green" | "orange" | "red" | "purple";
}) {
  const colors = {
    pink: "bg-[#FFF0F5] text-[#A50F4A]",
    green: "bg-[#EAF8EF] text-[#16834B]",
    orange: "bg-[#FFF4E6] text-[#B77612]",
    red: "bg-[#FFF0F1] text-[#C42B4A]",
    purple: "bg-[#F4EDFF] text-[#7434B4]",
  };
  const accents = {
    pink: "border-l-[#AD1451]",
    green: "border-l-[#16834B]",
    orange: "border-l-[#B77612]",
    red: "border-l-[#C42B4A]",
    purple: "border-l-[#7434B4]",
  };

  return (
    <div
      className={cn(
        "flex min-h-[100px] items-center gap-3 rounded-[20px] border border-[#F0DDE4] border-l-4 bg-white p-4 shadow-[0_6px_20px_rgba(72,20,43,0.05)]",
        accents[tone],
      )}
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", colors[tone])}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#775B6A]">{label}</p>
        <p className="mt-1 break-words text-xl font-extrabold text-[#43182D]">{value}</p>
      </div>
    </div>
  );
}
