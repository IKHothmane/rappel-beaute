"use client";

import type { CustomerKpis } from "@/types/customer";

export function CustomerKpisRow({ kpis }: { kpis: CustomerKpis }) {
  const cards = [
    { label: "Clientes", value: kpis.total },
    { label: "Nouvelles", value: `+${kpis.newCount}` },
    { label: "VIP", value: kpis.vipCount },
    { label: "Inactives", value: kpis.inactiveCount },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
            {c.label}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
