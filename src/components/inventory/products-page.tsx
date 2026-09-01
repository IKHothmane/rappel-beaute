"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ProductForm } from "@/components/inventory/product-form";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
import {
  createProduct,
  formatMad,
  formatQty,
  listProducts,
} from "@/modules/inventory/service";
import type { ProductListItem, StockKpis } from "@/types/inventory";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABEL,
} from "@/types/inventory";

export function ProductsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [alert, setAlert] = useState("");
  const [rows, setRows] = useState<ProductListItem[]>([]);
  const [kpis, setKpis] = useState<StockKpis | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listProducts({
        search,
        category: category || undefined,
        alert: alert || undefined,
        active: true,
        limit: 50,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les produits.", "error");
    }
  }, [search, category, alert, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleCreate(data: Parameters<typeof createProduct>[0]) {
    setSubmitting(true);
    const result = await createProduct(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast("Produit créé.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Produits"
        description="Catalogue — le stock est piloté par les mouvements, jamais écrasé."
        action={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Produit
            </button>
          ) : undefined
        }
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Produits" value={String(kpis.productCount)} />
          <Kpi label="Actifs" value={String(kpis.activeCount)} />
          <Kpi label="Stock faible" value={String(kpis.lowStockCount)} hint="Sous le seuil" />
          <Kpi label="Ruptures" value={String(kpis.outOfStockCount)} />
          <Kpi label="Valeur stock" value={formatMad(kpis.totalStockValue)} />
        </div>
      ) : null}

      {(kpis?.outOfStockCount || kpis?.lowStockCount || kpis?.expiringSoonCount) ? (
        <div className="mb-4 space-y-1 text-sm">
          {kpis.outOfStockCount > 0 ? (
            <p className="text-red-600">🔴 {kpis.outOfStockCount} produit(s) en rupture</p>
          ) : null}
          {kpis.lowStockCount > 0 ? (
            <p className="text-amber-700">🟠 {kpis.lowStockCount} produit(s) sous le seuil</p>
          ) : null}
          {kpis.expiringSoonCount > 0 ? (
            <p className="text-amber-600">🟡 {kpis.expiringSoonCount} produit(s) expirent bientôt</p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Toutes catégories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PRODUCT_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select
          value={alert}
          onChange={(e) => setAlert(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous stocks</option>
          <option value="LOW">Stock faible</option>
          <option value="OUT">Rupture</option>
          <option value="EXPIRING">Expiration proche</option>
          <option value="EXPIRED">Expiré</option>
        </select>
        <Link href="/stock/" className="text-sm text-primary self-center hover:underline">
          Voir les mouvements →
        </Link>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucun produit.</div>
      ) : (
        <ResponsiveTable
          headers={["Produit", "Catégorie", "Stock", "Prix achat", "Prix vente"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((p) => (
            <DataCard
              key={p.id}
              href={`/products/${p.id}/`}
              title={p.name}
              subtitle={`${p.sku} · ${PRODUCT_CATEGORY_LABEL[p.category]}`}
              meta={
                <>
                  <span className={p.alert === "OUT" || p.alert === "LOW" ? "text-red-600 font-mono" : "font-mono"}>
                    {formatQty(p.stock, p.unit)}
                  </span>
                  <span>{formatMad(p.purchasePrice)}</span>
                  <span>{p.salePrice != null ? formatMad(p.salePrice) : "—"}</span>
                </>
              }
            />
          ))}
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3">
                <Link href={`/products/${p.id}/`} className="font-medium text-primary">
                  {p.name}
                </Link>
                <span className="ml-2 text-xs text-ink/40">{p.sku}</span>
              </td>
              <td className="px-4 py-3 text-sm">{PRODUCT_CATEGORY_LABEL[p.category]}</td>
              <td className={`px-4 py-3 font-mono text-sm ${p.alert === "OUT" || p.alert === "LOW" ? "text-red-600" : ""}`}>
                {formatQty(p.stock, p.unit)}
              </td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(p.purchasePrice)}</td>
              <td className="px-4 py-3 font-mono text-sm">
                {p.salePrice != null ? formatMad(p.salePrice) : "—"}
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouveau produit">
        <ProductForm
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </motion.div>
  );
}
