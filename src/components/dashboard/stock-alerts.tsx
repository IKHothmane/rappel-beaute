"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProducts } from "@/modules/inventory/service";
import { PRODUCT_UNIT_LABEL } from "@/types/inventory";
import type { ProductListItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

export function StockAlerts() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [low, out] = await Promise.all([
          listProducts({ alert: "LOW", limit: 5, active: true }),
          listProducts({ alert: "OUT", limit: 5, active: true }),
        ]);
        if (cancelled) return;
        const merged = [...out.data, ...low.data];
        const seen = new Set<string>();
        setItems(merged.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, 6));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="border-0 pb-0">
        <div>
          <CardTitle>Alertes stock</CardTitle>
          <p className="mt-1 text-sm text-ink/45">
            {loading
              ? "Chargement…"
              : items.length === 0
                ? "Aucune alerte"
                : `${items.length} produit${items.length > 1 ? "s" : ""} à surveiller`}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Package size={19} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-ink/45">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/45">Stock OK — aucune alerte.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const level = item.stock <= 0 ? "Critique" : "Faible";
              const unit = PRODUCT_UNIT_LABEL[item.unit] ?? item.unit;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-[#FBF4F6] p-3"
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      level === "Critique" ? "bg-red-500" : "bg-amber-400",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-ink/45">
                      {item.stock} {unit}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      level === "Critique" ? "text-red-600" : "text-amber-600",
                    )}
                  >
                    {level}
                  </span>
                </div>
              );
            })}
          </div>
        )}

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
