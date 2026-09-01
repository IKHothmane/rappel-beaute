"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
import { listProducts } from "@/modules/inventory/service";
import {
  createPurchase,
  formatMad,
  listPurchases,
  listSuppliers,
  PURCHASE_STATUS_LABEL,
} from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type {
  PurchaseItemInput,
  PurchaseKpis,
  PurchaseListItem,
  PurchaseStatus,
  SupplierListItem,
} from "@/types/procurement";
import { PURCHASE_STATUSES } from "@/types/procurement";

type DraftLine = PurchaseItemInput & { key: string };

export function PurchasesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<PurchaseListItem[]>([]);
  const [kpis, setKpis] = useState<PurchaseKpis | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [catalog, setCatalog] = useState<ProductListItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { key: "1", productId: "", quantityOrdered: 1, unitPrice: 0 },
  ]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.quantityOrdered * l.unitPrice, 0),
    [lines],
  );

  const refresh = useCallback(async () => {
    try {
      const res = await listPurchases({
        search,
        status: status || undefined,
        limit: 40,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les achats.", "error");
    }
  }, [search, status, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    Promise.all([
      listSuppliers({ active: true, limit: 100 }),
      listProducts({ active: true, limit: 100 }),
    ])
      .then(([s, p]) => {
        setSuppliers(s.data);
        setCatalog(p.data);
      })
      .catch(() => undefined);
  }, []);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function handleCreate(submit: boolean) {
    if (!supplierId || lines.some((l) => !l.productId || l.quantityOrdered <= 0)) {
      toast("Fournisseur et lignes valides requis.", "error");
      return;
    }
    setSubmitting(true);
    const result = await createPurchase({
      supplierId,
      notes: notes || undefined,
      submit,
      items: lines.map(({ productId, quantityOrdered, unitPrice }) => ({
        productId,
        quantityOrdered,
        unitPrice,
      })),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast(submit ? "Commande envoyée." : "Brouillon enregistré.", "success");
    refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Achats"
        description="Commande → réception → InventoryMovement PURCHASE (ledger)."
        action={
          canWrite ? (
            <button type="button" className="btn-primary" onClick={() => setDrawerOpen(true)}>
              + Nouvelle commande
            </button>
          ) : undefined
        }
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Brouillons" value={String(kpis.draftCount)} />
          <Kpi label="À commander" value={String(kpis.orderedCount)} />
          <Kpi label="En attente réception" value={String(kpis.awaitingReceiptCount)} />
          <Kpi label="Ce mois" value={formatMad(kpis.monthTotal)} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="N° ou fournisseur…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          {PURCHASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PURCHASE_STATUS_LABEL[s as PurchaseStatus]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Aucune commande.</div>
      ) : (
        <ResponsiveTable
          headers={["N°", "Fournisseur", "Statut", "Lignes", "Total", "Date"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((p) => (
            <DataCard
              key={p.id}
              href={`/purchases/${p.id}/`}
              title={p.number}
              subtitle={p.supplierName}
              meta={
                <>
                  <span>{PURCHASE_STATUS_LABEL[p.status]}</span>
                  <br />
                  <span className="font-mono">{formatMad(p.total)}</span>
                </>
              }
            />
          ))}
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3">
                <Link href={`/purchases/${p.id}/`} className="font-mono text-sm text-primary">
                  {p.number}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm">{p.supplierName}</td>
              <td className="px-4 py-3 text-sm">{PURCHASE_STATUS_LABEL[p.status]}</td>
              <td className="px-4 py-3 font-mono text-sm">{p.itemCount}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(p.total)}</td>
              <td className="px-4 py-3 text-xs text-ink/50">
                {new Date(p.createdAt).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle commande">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Fournisseur *</span>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Choisir…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium">Produits</p>
            {lines.map((line) => (
              <div key={line.key} className="grid grid-cols-[1fr_72px_88px_auto] gap-2">
                <Select
                  value={line.productId}
                  onChange={(e) => {
                    const p = catalog.find((x) => x.id === e.target.value);
                    updateLine(line.key, {
                      productId: e.target.value,
                      unitPrice: p?.purchasePrice ?? line.unitPrice,
                    });
                  }}
                >
                  <option value="">Produit…</option>
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  value={line.quantityOrdered}
                  onChange={(e) =>
                    updateLine(line.key, { quantityOrdered: Number(e.target.value) || 0 })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })
                  }
                />
                <button
                  type="button"
                  className="text-ink/40 hover:text-red-600"
                  onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    key: String(Date.now()),
                    productId: "",
                    quantityOrdered: 1,
                    unitPrice: 0,
                  },
                ])
              }
            >
              + Ligne
            </button>
          </div>

          <p className="text-right font-mono text-sm font-semibold">
            Total {formatMad(total)}
          </p>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Notes</span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:flex-1"
              disabled={submitting}
              onClick={() => handleCreate(false)}
            >
              Brouillon
            </Button>
            <Button
              type="button"
              variant="primary"
              className="w-full sm:flex-1"
              disabled={submitting}
              onClick={() => handleCreate(true)}
            >
              Commander
            </Button>
          </div>
        </div>
      </Drawer>
    </motion.div>
  );
}
