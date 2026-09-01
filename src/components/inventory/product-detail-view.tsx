"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ProductForm } from "@/components/inventory/product-form";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
import {
  createMovement,
  formatMad,
  formatQty,
  getProduct,
  MOVEMENT_TYPE_LABEL,
  updateProduct,
} from "@/modules/inventory/service";
import type { MovementType, ProductDetail } from "@/types/inventory";
import { PRODUCT_CATEGORY_LABEL } from "@/types/inventory";

const TABS = ["Profil", "Stock", "Mouvements", "Services", "Fournisseurs", "Lots / Expiration"];

export function ProductDetailView({ productId }: { productId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);

  const [tab, setTab] = useState("Profil");
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [movType, setMovType] = useState<MovementType>("PURCHASE");
  const [movQty, setMovQty] = useState("");
  const [movReason, setMovReason] = useState("");

  const refresh = useCallback(async () => {
    try {
      setProduct(await getProduct(productId));
    } catch {
      toast("Produit introuvable.", "error");
      setProduct(null);
    }
  }, [productId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }
  if (!product) {
    return (
      <div className="surface p-8 text-center">
        <Link href="/products/" className="text-sm font-semibold text-primary">
          ← Retour aux produits
        </Link>
      </div>
    );
  }

  async function handleUpdate(data: Parameters<typeof updateProduct>[1]) {
    setSubmitting(true);
    const result = await updateProduct(productId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setEditOpen(false);
    toast("Produit mis à jour.", "success");
    refresh();
  }

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await createMovement({
      productId,
      type: movType,
      quantity: Number(movQty),
      reason: movReason || undefined,
      referenceType: "MANUAL",
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Mouvement enregistré.", "success");
    setMovQty("");
    setMovReason("");
    refresh();
  }

  return (
    <div>
      <Link href="/products/" className="mb-4 inline-block text-sm text-primary">
        ← Produits
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-ink/55">
            {product.sku} · {PRODUCT_CATEGORY_LABEL[product.category]}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          <Stat label="Stock actuel" value={formatQty(product.stock, product.unit)} alert={product.alert !== "OK"} />
          <Stat label="Minimum" value={formatQty(product.minStock, product.unit)} />
          <Stat label="Prix achat" value={formatMad(product.purchasePrice)} />
          <Stat label="Valeur stock" value={formatMad(product.stockValue)} />
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="surface p-5">
        {tab === "Profil" ? (
          <div className="space-y-3 text-sm">
            {canWrite ? (
              <button type="button" className="btn-primary mb-3" onClick={() => setEditOpen(true)}>
                Modifier
              </button>
            ) : null}
            <p>Marque · {product.brand ?? "—"}</p>
            <p>Fournisseur · {product.supplierName ?? "—"}</p>
            <p>Prix vente · {product.salePrice != null ? formatMad(product.salePrice) : "—"}</p>
            <p>Consommable · {product.consumable ? "Oui" : "Non"} · Vendable · {product.sellable ? "Oui" : "Non"}</p>
            <p>Notes · {product.notes ?? "—"}</p>
          </div>
        ) : null}

        {tab === "Stock" && canWrite ? (
          <form onSubmit={handleMovement} className="max-w-md space-y-3">
            <p className="text-sm font-medium">Nouveau mouvement</p>
            <Select value={movType} onChange={(e) => setMovType(e.target.value as MovementType)}>
              {(["PURCHASE", "SALE", "LOSS", "DAMAGE", "RETURN", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"] as MovementType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {MOVEMENT_TYPE_LABEL[t]}
                  </option>
                ),
              )}
            </Select>
            <Input
              type="number"
              min={0.001}
              step={0.001}
              value={movQty}
              onChange={(e) => setMovQty(e.target.value)}
              placeholder="Quantité"
              required
            />
            <Input value={movReason} onChange={(e) => setMovReason(e.target.value)} placeholder="Motif" />
            <Button type="submit" variant="primary" disabled={submitting}>
              Enregistrer le mouvement
            </Button>
          </form>
        ) : null}
        {tab === "Stock" && !canWrite ? (
          <p className="text-sm text-ink/50">Lecture seule.</p>
        ) : null}

        {tab === "Mouvements" ? (
          product.recentMovements.length === 0 ? (
            <p className="text-sm text-ink/50">Aucun mouvement.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {product.recentMovements.map((m) => (
                <li key={m.id} className="flex justify-between gap-2 border-b border-line py-2">
                  <span>
                    {new Date(m.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {MOVEMENT_TYPE_LABEL[m.type]}
                    {m.userName ? ` · ${m.userName}` : ""}
                  </span>
                  <span className={`font-mono ${m.quantity < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {m.quantity > 0 ? "+" : ""}
                    {formatQty(m.quantity, m.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "Services" ? (
          product.services.length === 0 ? (
            <p className="text-sm text-ink/50">
              Aucun service lié — configurez via le module Services → Produits consommés.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {product.services.map((s) => (
                <li key={s.serviceId}>
                  ✓ {s.serviceName} · −{s.quantity} {s.unit}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "Fournisseurs" ? (
          !product.suppliers?.length ? (
            <div className="space-y-2 text-sm">
              <p>Fournisseur libre · {product.supplierName ?? "Non renseigné"}</p>
              <p className="text-ink/45">
                Liez des fournisseurs via{" "}
                <Link href="/suppliers/" className="text-primary underline">
                  Fournisseurs → Produits
                </Link>{" "}
                pour comparer les prix négociés.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {product.suppliers.map((s) => (
                <li key={s.supplierId} className="flex justify-between border-b border-line py-2">
                  <Link href={`/suppliers/${s.supplierId}/`} className="text-primary">
                    {s.supplierName}
                    {s.preferred ? " ★" : ""}
                  </Link>
                  <span className="font-mono">{formatMad(s.purchasePrice)}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "Lots / Expiration" ? (
          product.lots.length === 0 ? (
            <p className="text-sm text-ink/50">Aucun lot enregistré.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {product.lots.map((l) => (
                <li key={l.id} className="rounded-lg border border-line p-3">
                  <p className="font-medium">Lot {l.lotNumber}</p>
                  <p>
                    {formatQty(l.quantity, product.unit)}
                    {l.expiresAt
                      ? ` · Expire le ${new Date(l.expiresAt).toLocaleDateString("fr-FR")}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le produit">
        <ProductForm
          initial={product}
          submitting={submitting}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Drawer>
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2 text-center">
      <p className={`font-mono text-base font-semibold ${alert ? "text-red-600" : ""}`}>{value}</p>
      <p className="text-xs text-ink/45">{label}</p>
    </div>
  );
}
