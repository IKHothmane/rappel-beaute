"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { SupplierForm } from "@/components/procurement/supplier-form";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
import {
  createSupplier,
  formatMad,
  listSuppliers,
} from "@/modules/procurement/service";
import type { SupplierKpis, SupplierListItem } from "@/types/procurement";

export function SuppliersPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [rows, setRows] = useState<SupplierListItem[]>([]);
  const [kpis, setKpis] = useState<SupplierKpis | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listSuppliers({
        search,
        active: activeOnly ? true : null,
        limit: 50,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les fournisseurs.", "error");
    }
  }, [search, activeOnly, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleCreate(data: Parameters<typeof createSupplier>[0]) {
    setSubmitting(true);
    const result = await createSupplier(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast("Fournisseur créé.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Fournisseurs"
        description="Catalogue fournisseurs — prix négociés via ProductSupplier (N-N)."
        action={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Fournisseur
            </button>
          ) : undefined
        }
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Fournisseurs" value={String(kpis.supplierCount)} />
          <Kpi label="Actifs" value={String(kpis.activeCount)} />
          <Kpi label="Commandes en cours" value={String(kpis.openOrdersCount)} />
          <Kpi label="Achats ce mois" value={formatMad(kpis.monthPurchasesTotal)} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Actifs uniquement
        </label>
        <Link href="/purchases/" className="text-sm text-primary sm:ml-auto hover:underline">
          Voir les achats →
        </Link>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucun fournisseur.</div>
      ) : (
        <ResponsiveTable
          headers={["Fournisseur", "Contact", "Produits", "Commandes", "Statut"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((s) => (
            <DataCard
              key={s.id}
              href={`/suppliers/${s.id}/`}
              title={s.name}
              subtitle={s.contactName ?? s.phone ?? s.email ?? "—"}
              meta={
                <>
                  <span>{s.productCount} produits</span>
                  <br />
                  <span>{s.purchaseCount} cmd</span>
                </>
              }
            />
          ))}
        >
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3">
                <Link href={`/suppliers/${s.id}/`} className="font-medium text-primary">
                  {s.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm">
                {s.phone ?? "—"}
                {s.contactName ? (
                  <span className="mt-0.5 block text-xs text-ink/45">{s.contactName}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 font-mono text-sm">{s.productCount}</td>
              <td className="px-4 py-3 font-mono text-sm">{s.purchaseCount}</td>
              <td className="px-4 py-3 text-sm">
                <span className={s.active ? "text-emerald-700" : "text-ink/40"}>
                  ● {s.active ? "Actif" : "Archivé"}
                </span>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouveau fournisseur">
        <SupplierForm
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </motion.div>
  );
}
