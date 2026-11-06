"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type StockCategorySlice = {
  key: string;
  label: string;
  count: number;
  value: number;
};

type Props = {
  categories: StockCategorySlice[];
  financeHidden?: boolean;
};

const COLORS = ["#AC0E4C", "#E879A8", "#F2B8CE", "#C4A0D8", "#F0A56A", "#7EB89A"];

export function InventoryPremiumCharts({ categories, financeHidden = false }: Props) {
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);
  const totalValue = categories.reduce((sum, c) => sum + c.value, 0);

  const valuationData = categories
    .filter((c) => c.value > 0 || c.count > 0)
    .map((c) => ({
      name: c.label,
      valeur: Math.round(c.value * 100) / 100,
    }));

  const distributionData = categories
    .filter((c) => c.count > 0)
    .map((c) => ({
      name: c.label,
      value: c.count,
    }));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-[22px] border border-[#F0DDE4] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="font-serif text-lg font-bold text-[#54112F]">Évaluation du stock</h3>
          <p className="mt-1 text-xs text-[#846A79]">
            {financeHidden
              ? "Valeurs masquées selon vos permissions"
              : totalValue > 0
                ? `Valeur totale : ${totalValue.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`
                : "Répartition de la valeur par catégorie"}
          </p>
        </div>
        <div className="h-56">
          {financeHidden ? (
            <p className="flex h-full items-center justify-center text-sm text-[#846A79]">—</p>
          ) : valuationData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-[#846A79]">
              Aucune valeur de stock à afficher
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={valuationData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockValueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#AC0E4C" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#AC0E4C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1E7ED" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8E7D8A", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tick={{ fill: "#8E7D8A", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value ?? 0).toLocaleString("fr-MA")} MAD`,
                    "Valeur",
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #F0E3E6" }}
                />
                <Area
                  type="monotone"
                  dataKey="valeur"
                  stroke="#AC0E4C"
                  strokeWidth={3}
                  fill="url(#stockValueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-[22px] border border-[#F0DDE4] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="font-serif text-lg font-bold text-[#54112F]">Répartition par catégorie</h3>
          <p className="mt-1 text-xs text-[#846A79]">
            {totalCount} référence{totalCount > 1 ? "s" : ""} au catalogue
          </p>
        </div>
        <div className="flex h-56 items-center gap-4">
          {distributionData.length === 0 ? (
            <p className="flex h-full w-full items-center justify-center text-sm text-[#846A79]">
              Aucune catégorie à afficher
            </p>
          ) : (
            <>
              <div className="h-full min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value ?? 0)} produit${Number(value ?? 0) > 1 ? "s" : ""}`,
                        String(name),
                      ]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #F0E3E6" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex w-[42%] flex-col gap-2 text-xs">
                {distributionData.map((entry, index) => {
                  const pct = totalCount ? Math.round((entry.value / totalCount) * 100) : 0;
                  return (
                    <li key={entry.name} className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-2 text-[#765164]">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="shrink-0 font-bold text-[#43182D]">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
