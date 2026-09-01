"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
import {
  applyInventoryCount,
  formatMad,
  formatQty,
  getStockKpis,
  listMovements,
  listProducts,
  MOVEMENT_TYPE_LABEL,
} from "@/modules/inventory/service";
import type { InventoryMovementItem, ProductListItem, StockKpis } from "@/types/inventory";

export function InventoryPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);

  const [tab, setTab] = useState("Mouvements");
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<InventoryMovementItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [kpis, setKpis] = useState<StockKpis | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [mov, prods, k] = await Promise.all([
        listMovements({ limit: 40 }),
        listProducts({ limit: 100, active: true }),
        getStockKpis(),
      ]);
      setMovements(mov.data);
      setProducts(prods.data);
      setKpis(k);
      const init: Record<string, string> = {};
      for (const p of prods.data) init[p.id] = String(p.stock);
      setCounts(init);
    } catch {
      toast("Impossible de charger le stock.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleInventory() {
    setSubmitting(true);
    const items = products
      .map((p) => ({
        productId: p.id,
        countedQuantity: Number(counts[p.id]),
      }))
      .filter((i) => !Number.isNaN(i.countedQuantity));

    const result = await applyInventoryCount(items);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`${result.adjustments} ajustement(s) créé(s).`, "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Stock"
        description="Source de vérité = InventoryMovement. Le stock affiché est un cache recalculé."
        action={
          <Link href="/products/" className="btn-primary">
            Catalogue produits
          </Link>
        }
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Produits" value={String(kpis.productCount)} />
          <Kpi label="Ruptures" value={String(kpis.outOfStockCount)} />
          <Kpi label="Stock faible" value={String(kpis.lowStockCount)} />
          <Kpi label="Valeur" value={formatMad(kpis.totalStockValue)} />
        </div>
      ) : null}

      <Tabs
        tabs={["Mouvements", "Inventaire", "Alertes"]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : null}

      {!loading && tab === "Mouvements" ? (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line font-mono text-[10px] uppercase text-ink/40">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Quantité</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Réf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/products/${m.productId}/`} className="text-primary">
                      {m.productName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{MOVEMENT_TYPE_LABEL[m.type]}</td>
                  <td className={`px-4 py-3 font-mono ${m.quantity < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {m.quantity > 0 ? "+" : ""}
                    {formatQty(m.quantity, m.unit)}
                  </td>
                  <td className="px-4 py-3">{m.userName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink/50">
                    {m.referenceType ?? "—"}
                    {m.referenceId ? ` ${m.referenceId.slice(0, 12)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/50">Aucun mouvement.</p>
          ) : null}
        </div>
      ) : null}

      {!loading && tab === "Inventaire" ? (
        <div className="space-y-4">
          <p className="text-sm text-ink/60">
            Saisissez le stock réel. Les écarts créent des mouvements ADJUSTMENT (historique intact).
          </p>
          <ul className="surface divide-y divide-line">
            {products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-[140px] flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-ink/45">
                    Théorique : {formatQty(p.stock, p.unit)}
                  </p>
                </div>
                <Input
                  type="number"
                  step={0.001}
                  className="w-28"
                  value={counts[p.id] ?? ""}
                  onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
                  disabled={!canWrite}
                />
              </li>
            ))}
          </ul>
          {canWrite ? (
            <Button type="button" variant="primary" disabled={submitting} onClick={handleInventory}>
              {submitting ? "Validation…" : "Valider l'inventaire"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!loading && tab === "Alertes" && kpis ? (
        <div className="surface space-y-3 p-5 text-sm">
          <p className="text-red-600">🔴 {kpis.outOfStockCount} produit(s) en rupture</p>
          <p className="text-amber-700">🟠 {kpis.lowStockCount} produit(s) sous le seuil</p>
          <p className="text-amber-600">🟡 {kpis.expiringSoonCount} produit(s) expirent sous 30 jours</p>
          <p className="text-ink/50">⚫ {kpis.expiredCount} produit(s) avec lot expiré</p>
          <Link href="/products/?alert=LOW" className="inline-block text-primary hover:underline">
            Voir les produits en alerte →
          </Link>
        </div>
      ) : null}
    </motion.div>
  );
}
