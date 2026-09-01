"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { SupplierForm } from "@/components/procurement/supplier-form";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
import { listProducts } from "@/modules/inventory/service";
import {
  archiveSupplier,
  formatMad,
  getSupplier,
  linkProductSupplier,
  PURCHASE_STATUS_LABEL,
  unlinkProductSupplier,
  updateSupplier,
} from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type { SupplierDetail } from "@/types/procurement";

const TABS = ["Profil", "Produits", "Commandes", "Historique"];

export function SupplierDetailView({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);

  const [tab, setTab] = useState("Profil");
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [catalog, setCatalog] = useState<ProductListItem[]>([]);
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [preferred, setPreferred] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSupplier(await getSupplier(supplierId));
    } catch {
      toast("Fournisseur introuvable.", "error");
      setSupplier(null);
    }
  }, [supplierId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listProducts({ limit: 100, active: true })
      .then((r) => setCatalog(r.data))
      .catch(() => undefined);
  }, []);

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }
  if (!supplier) {
    return (
      <div className="surface p-8 text-center">
        <Link href="/suppliers/" className="text-sm font-semibold text-primary">
          ← Retour
        </Link>
      </div>
    );
  }

  async function handleUpdate(data: Parameters<typeof updateSupplier>[1]) {
    setSubmitting(true);
    const result = await updateSupplier(supplierId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setEditOpen(false);
    toast("Fournisseur mis à jour.", "success");
    refresh();
  }

  async function handleArchive() {
    if (!confirm("Archiver ce fournisseur ?")) return;
    const result = await archiveSupplier(supplierId);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Fournisseur archivé.", "success");
    refresh();
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !price) return;
    setSubmitting(true);
    const result = await linkProductSupplier(supplierId, {
      productId,
      purchasePrice: Number(price),
      preferred,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Produit lié.", "success");
    setProductId("");
    setPrice("");
    setPreferred(false);
    refresh();
  }

  return (
    <div>
      <Link href="/suppliers/" className="mb-4 inline-block text-sm text-primary">
        ← Fournisseurs
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{supplier.name}</h1>
          <p className="text-sm text-ink/55">
            {supplier.contactName ?? "—"} · {supplier.phone ?? "—"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Commandes" value={String(supplier.purchaseCount)} />
          <Stat label="Achats" value={formatMad(supplier.totalPurchased)} />
          <Stat label="Produits" value={String(supplier.productCount)} />
          <Stat
            label="Dernière cmd"
            value={
              supplier.lastPurchaseAt
                ? new Date(supplier.lastPurchaseAt).toLocaleDateString("fr-FR")
                : "—"
            }
          />
        </div>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <div className="surface p-5">
        {tab === "Profil" ? (
          <div className="space-y-3 text-sm">
            {canWrite ? (
              <div className="mb-3 flex gap-2">
                <button type="button" className="btn-primary" onClick={() => setEditOpen(true)}>
                  Modifier
                </button>
                {supplier.active ? (
                  <Button type="button" variant="ghost" onClick={handleArchive}>
                    Archiver
                  </Button>
                ) : null}
              </div>
            ) : null}
            <p>Email · {supplier.email ?? "—"}</p>
            <p>Adresse · {supplier.address ?? "—"}</p>
            <p>Notes · {supplier.notes ?? "—"}</p>
            <p>
              Statut ·{" "}
              <span className={supplier.active ? "text-emerald-700" : "text-ink/40"}>
                {supplier.active ? "Actif" : "Archivé"}
              </span>
            </p>
          </div>
        ) : null}

        {tab === "Produits" ? (
          <div className="space-y-4">
            {canWrite ? (
              <form onSubmit={handleLink} className="grid gap-2 sm:grid-cols-[1fr_100px_auto_auto]">
                <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
                  <option value="">Produit…</option>
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Prix"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={preferred}
                    onChange={(e) => setPreferred(e.target.checked)}
                  />
                  Préféré
                </label>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Lier
                </Button>
              </form>
            ) : null}
            {supplier.products.length === 0 ? (
              <p className="text-sm text-ink/50">Aucun produit lié.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {supplier.products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">
                        {p.productName}
                        {p.preferred ? (
                          <span className="ml-2 text-xs text-primary">préféré</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-ink/45">{p.productSku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{formatMad(p.purchasePrice)}</span>
                      {canWrite ? (
                        <button
                          type="button"
                          className="text-ink/40 hover:text-red-600"
                          onClick={async () => {
                            const r = await unlinkProductSupplier(supplierId, p.productId);
                            if (!r.ok) toast(r.error, "error");
                            else {
                              toast("Lien retiré.", "success");
                              refresh();
                            }
                          }}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "Commandes" || tab === "Historique" ? (
          supplier.recentPurchases.length === 0 ? (
            <p className="text-sm text-ink/50">Aucune commande.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {supplier.recentPurchases.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-3">
                  <Link href={`/purchases/${p.id}/`} className="text-primary">
                    {p.number}
                  </Link>
                  <span>{PURCHASE_STATUS_LABEL[p.status]}</span>
                  <span className="font-mono">{formatMad(p.total)}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier">
        <SupplierForm
          initial={supplier}
          submitting={submitting}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2 text-center">
      <p className="font-mono text-base font-semibold">{value}</p>
      <p className="text-xs text-ink/45">{label}</p>
    </div>
  );
}
