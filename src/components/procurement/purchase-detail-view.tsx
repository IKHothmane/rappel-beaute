"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canWriteStock } from "@/lib/rbac";
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

type RecvDraft = Record<
  string,
  { quantity: string; lotNumber: string; expiresAt: string }
>;

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
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }
  if (!purchase) {
    return (
      <div className="surface p-8 text-center">
        <Link href="/purchases/" className="text-sm font-semibold text-primary">
          ← Achats
        </Link>
      </div>
    );
  }

  const canReceive =
    canWrite &&
    (purchase.status === "ORDERED" || purchase.status === "PARTIALLY_RECEIVED");
  const canOrder = canWrite && purchase.status === "DRAFT";
  const canCancel =
    canWrite && (purchase.status === "DRAFT" || purchase.status === "ORDERED");

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
    const key = idempotencyRef.current;
    const result = await receivePurchase(purchaseId, {
      idempotencyKey: key,
      items,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }

    // Nouvelle clé pour une éventuelle réception suivante
    idempotencyRef.current = newIdempotencyKey();
    toast(
      result.created
        ? "Réception enregistrée (mouvements PURCHASE créés)."
        : "Réception déjà enregistrée (idempotence).",
      "success",
    );
    refresh();
  }

  return (
    <div>
      <Link href="/purchases/" className="mb-4 inline-block text-sm text-primary">
        ← Achats
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-primary">{purchase.number}</p>
          <h1 className="font-display text-2xl font-semibold">{purchase.supplierName}</h1>
          <p className="text-sm text-ink/55">
            {PURCHASE_STATUS_LABEL[purchase.status]} · {formatMad(purchase.total)}
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

      <div className="mb-6 surface overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line font-mono text-[10px] uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Commandé</th>
              <th className="px-4 py-3">Reçu</th>
              <th className="px-4 py-3">Reste</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {purchase.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <Link href={`/products/${item.productId}/`} className="text-primary">
                    {item.productName}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">
                  {formatQty(item.quantityOrdered, item.unit)}
                </td>
                <td className="px-4 py-3 font-mono">
                  {formatQty(item.quantityReceived, item.unit)}
                </td>
                <td className="px-4 py-3 font-mono">
                  {formatQty(item.quantityRemaining, item.unit)}
                </td>
                <td className="px-4 py-3 font-mono">{formatMad(item.unitPrice)}</td>
                <td className="px-4 py-3 font-mono">{formatMad(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canReceive ? (
        <div className="mb-6 space-y-4 surface p-5">
          <h2 className="font-display text-lg font-semibold">Réception</h2>
          <p className="text-sm text-ink/55">
            Crée des mouvements PURCHASE dans le ledger — jamais d&apos;écriture directe du stock.
            Double-clic protégé par clé d&apos;idempotence.
          </p>
          <ul className="space-y-4">
            {purchase.items
              .filter((i) => i.quantityRemaining > 0)
              .map((item) => (
                <li key={item.id} className="grid gap-2 border-b border-line pb-4 sm:grid-cols-4">
                  <div className="sm:col-span-4">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-ink/45">
                      Reste {formatQty(item.quantityRemaining, item.unit)}
                    </p>
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
                      placeholder="HYD-2026-08"
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
        <div className="surface p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Historique réceptions</h2>
          <ul className="space-y-3 text-sm">
            {purchase.receipts.map((r) => (
              <li key={r.id} className="border-b border-line pb-3">
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
