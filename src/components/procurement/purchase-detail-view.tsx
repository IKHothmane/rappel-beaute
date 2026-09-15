"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { canReceiveStatus, formatPurchaseDate, purchaseStatusChip } from "@/components/procurement/purchase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatQty } from "@/modules/inventory/service";
import {
  formatMad,
  getPurchase,
  newIdempotencyKey,
  PURCHASE_STATUS_LABEL,
  receivePurchase,
  updatePurchase,
} from "@/modules/procurement/service";
import type { PurchaseDetail } from "@/types/procurement";

type RecvDraft = Record<string, { quantity: string; lotNumber: string; expiresAt: string }>;

export function PurchaseDetailView({ purchaseId }: { purchaseId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStock(user.role);
  const idempotencyRef = useRef(newIdempotencyKey());

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recv, setRecv] = useState<RecvDraft>({});

  const refresh = useCallback(async () => {
    try {
      const p = await getPurchase(purchaseId);
      setPurchase(p);
      const draft: RecvDraft = {};
      for (const item of p.items) {
        draft[item.id] = {
          quantity: item.quantityRemaining > 0 ? String(item.quantityRemaining) : "0",
          lotNumber: "",
          expiresAt: "",
        };
      }
      setRecv(draft);
    } catch {
      toast("Commande introuvable.", "error");
      setPurchase(null);
    }
  }, [purchaseId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50 shadow-sm">Chargement…</div>;
  }
  if (!purchase) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <Link href="/purchases/" className="text-sm font-semibold text-primary">
          ← Achats
        </Link>
      </div>
    );
  }

  const canReceive = canWrite && canReceiveStatus(purchase.status);
  const canOrder = canWrite && purchase.status === "DRAFT";
  const canCancel = canWrite && (purchase.status === "DRAFT" || purchase.status === "ORDERED");

  async function handleOrder() {
    setSubmitting(true);
    const result = await updatePurchase(purchaseId, { status: "ORDERED" });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Commande envoyée.", "success");
    refresh();
  }

  async function handleCancel() {
    if (!confirm("Annuler cette commande ?")) return;
    setSubmitting(true);
    const result = await updatePurchase(purchaseId, { status: "CANCELLED" });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Commande annulée.", "success");
    refresh();
  }

  async function handleReceive() {
    if (!purchase) return;
    const items = purchase.items
      .map((item) => ({
        purchaseItemId: item.id,
        quantity: Number(recv[item.id]?.quantity || 0),
        lotNumber: recv[item.id]?.lotNumber || undefined,
        expiresAt: recv[item.id]?.expiresAt || undefined,
      }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      toast("Saisissez au moins une quantité à recevoir.", "error");
      return;
    }

    setSubmitting(true);
    const result = await receivePurchase(purchaseId, {
      idempotencyKey: idempotencyRef.current,
      items,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    idempotencyRef.current = newIdempotencyKey();
    toast(
      result.created ? "Réception enregistrée (mouvements de stock créés)." : "Réception déjà enregistrée.",
      "success",
    );
    refresh();
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <Link href="/purchases/" className="text-sm font-semibold text-primary">
        ← Achats
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-bold text-primary">{purchase.number}</p>
          <h1 className="font-display text-2xl font-semibold text-ink">{purchase.supplierName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", purchaseStatusChip(purchase.status))}>
              {PURCHASE_STATUS_LABEL[purchase.status]}
            </span>
            <span className="text-sm text-ink/55">{formatMad(purchase.total)}</span>
          </div>
          <p className="mt-1 text-[12px] text-ink/45">
            Émise {formatPurchaseDate(purchase.createdAt)}
            {purchase.orderedAt ? ` · Commandée ${formatPurchaseDate(purchase.orderedAt)}` : ""}
            {purchase.receivedAt ? ` · Reçue ${formatPurchaseDate(purchase.receivedAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canOrder ? (
            <Button type="button" variant="primary" disabled={submitting} onClick={handleOrder}>
              Envoyer la commande
            </Button>
          ) : null}
          {canCancel ? (
            <Button type="button" variant="ghost" disabled={submitting} onClick={handleCancel}>
              Annuler
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#FFEFF8] text-[11px] font-bold uppercase tracking-wider text-ink/40">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Commandé</th>
                <th className="px-4 py-3">Reçu</th>
                <th className="px-4 py-3">Reste</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item) => (
                <tr key={item.id} className="border-t border-[#F0DDE9]/60">
                  <td className="px-4 py-3">
                    <Link href={`/products/${item.productId}/`} className="font-semibold text-primary">
                      {item.productName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatQty(item.quantityOrdered, item.unit)}</td>
                  <td className="px-4 py-3 font-mono">{formatQty(item.quantityReceived, item.unit)}</td>
                  <td className="px-4 py-3 font-mono">{formatQty(item.quantityRemaining, item.unit)}</td>
                  <td className="px-4 py-3 font-mono">{formatMad(item.unitPrice)}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{formatMad(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canReceive ? (
        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Réception</h2>
          <p className="text-sm text-ink/55">
            Crée des mouvements d’entrée dans le stock. Le reliquat reste ouvert jusqu’au prochain pointage.
          </p>
          <ul className="space-y-4">
            {purchase.items
              .filter((i) => i.quantityRemaining > 0)
              .map((item) => (
                <li key={item.id} className="grid gap-2 border-b border-[#F0DDE9] pb-4 sm:grid-cols-4">
                  <div className="sm:col-span-4">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-ink/45">Reste {formatQty(item.quantityRemaining, item.unit)}</p>
                  </div>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-ink/50">Quantité</span>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantityRemaining}
                      step={0.001}
                      value={recv[item.id]?.quantity ?? "0"}
                      onChange={(e) =>
                        setRecv((d) => ({
                          ...d,
                          [item.id]: { ...d[item.id], quantity: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-ink/50">Lot</span>
                    <Input
                      value={recv[item.id]?.lotNumber ?? ""}
                      onChange={(e) =>
                        setRecv((d) => ({
                          ...d,
                          [item.id]: { ...d[item.id], lotNumber: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block text-xs text-ink/50">Expiration</span>
                    <Input
                      type="date"
                      value={recv[item.id]?.expiresAt ?? ""}
                      onChange={(e) =>
                        setRecv((d) => ({
                          ...d,
                          [item.id]: { ...d[item.id], expiresAt: e.target.value },
                        }))
                      }
                    />
                  </label>
                </li>
              ))}
          </ul>
          <Button type="button" variant="primary" disabled={submitting} onClick={handleReceive}>
            {submitting ? "Réception…" : "Valider la réception"}
          </Button>
        </div>
      ) : null}

      {purchase.receipts.length > 0 ? (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-ink">Historique réceptions</h2>
          <ul className="space-y-3 text-sm">
            {purchase.receipts.map((r) => (
              <li key={r.id} className="border-b border-[#F0DDE9] pb-3">
                <p className="font-medium">
                  {new Date(r.receivedAt).toLocaleString("fr-FR")}
                  {r.userName ? ` · ${r.userName}` : ""}
                </p>
                <ul className="mt-1 text-ink/60">
                  {r.lines.map((l) => (
                    <li key={l.id}>
                      {l.productName} · +{l.quantity}
                      {l.lotNumber ? ` · Lot ${l.lotNumber}` : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
