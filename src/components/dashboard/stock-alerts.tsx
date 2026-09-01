"use client";

import { ArrowRight, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCTS } from "@/lib/app-mock";
import { cn } from "@/lib/utils";

export function StockAlerts() {
  const alerts = PRODUCTS.filter((p) => p.stock <= p.min).map((p) => ({
    name: p.name,
    stock: `${p.stock} ${p.unit}`,
    level: p.stock < p.min / 2 ? "Critique" : "Faible",
  }));

  const items =
    alerts.length > 0
      ? alerts
      : [
          { name: "Sérum Hydrafacial", stock: "2 unités", level: "Critique" },
          { name: "Masque visage", stock: "6 unités", level: "Faible" },
          { name: "Gants nitrile", stock: "12 unités", level: "Faible" },
        ];

  return (
    <Card>
      <CardHeader className="border-0 pb-0">
        <div>
          <CardTitle>Alertes stock</CardTitle>
          <p className="mt-1 text-sm text-ink/45">
            {items.length} produit{items.length > 1 ? "s" : ""} à surveiller
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Package size={19} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-xl bg-[#FBF4F6] p-3"
            >
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  item.level === "Critique" ? "bg-red-500" : "bg-amber-400",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-ink/45">{item.stock}</p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  item.level === "Critique" ? "text-red-600" : "text-amber-600",
                )}
              >
                {item.level}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/inventory/"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-[#FBF4F6]"
        >
          Gérer le stock
          <ArrowRight size={16} />
        </Link>
      </CardContent>
    </Card>
  );
}
