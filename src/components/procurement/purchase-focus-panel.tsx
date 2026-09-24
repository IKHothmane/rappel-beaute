"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { canReceiveStatus, formatPurchaseDate, purchaseStatusChip } from "@/components/procurement/purchase-helpers";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatQty } from "@/modules/inventory/service";
import {
  formatMad,
  getPurchase,
  newIdempotencyKey,
  PURCHASE_STATUS_LABEL,
  receivePurchase,
} from "@/modules/procurement/service";
import type { PurchaseDetail, PurchaseListItem } from "@/types/procurement";

type RecvDraft = Record<string, { quantity: string; lotNumber: string; expiresAt: string }>;

type Props = {
  purchaseId: string;
  fallback: PurchaseListItem;
  canWrite: boolean;
  financeHidden: boolean;
  onReceived: () => void;
  onToast: (msg: string, kind?: "success" | "error" | "info") => void;
  onOpenFull?: () => void;
};

export function PurchaseFocusPanel({
  purchaseId,
  fallback,
  canWrite,
  financeHidden,
  onReceived,
  onToast,
  onOpenFull,
}: Props) {
  const idempotencyRef = useRef(newIdempotencyKey());
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [recv, setRecv] = useState<RecvDraft>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const p = await getPurchase(purchaseId);
    setDetail(p);
    const draft: RecvDraft = {};
    for (const item of p.items) {
      draft[item.id] = {
        quantity: item.quantityRemaining > 0 ? String(item.quantityRemaining) : "0",
        lotNumber: "",
        expiresAt: "",
      };
    }
    setRecv(draft);
  }, [purchaseId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    load()
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const p = detail ?? fallback;
  const canReceive = canWrite && canReceiveStatus(p.status);

  async function handleReceive() {
    if (!detail) return;
    const items = detail.items
      .map((item) => ({
        purchaseItemId: item.id,
        quantity: Number(recv[item.id]?.quantity || 0),
        lotNumber: recv[item.id]?.lotNumber || undefined,
        expiresAt: recv[item.id]?.expiresAt || undefined,
      }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      onToast("Saisissez au moins une quantité à recevoir.", "error");
      return;
    }

    setSubmitting(true);
    const result = await receivePurchase(purchaseId, {
      idempotencyKey: idempotencyRef.current,
      items,
    });
    setSubmitting(false);
    if (!result.ok) {
      onToast(result.error, "error");
      return;
    }
    idempotencyRef.current = newIdempotencyKey();
    onToast(
      result.created
        ? "Réception enregistrée — mouvements de stock créés."
        : "Réception déjà enregistrée.",
      "success",
    );
    await load();
    onReceived();
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-[#FFEFF8] pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            <h3 className="text-[18px] font-bold text-ink">Contrôle de réception</h3>
          </div>
          <p className="mt-1 font-mono text-[12px] font-semibold text-ink">{p.number}</p>
          {p.supplierId ? (
            <Link href={`/suppliers/${p.supplierId}/`} className="text-[13px] font-semibold text-primary hover:underline">
              {p.supplierName}
            </Link>
          ) : (
            <p className="text-[13px] font-semibold text-ink/55">{p.supplierName}</p>
          )}
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", purchaseStatusChip(p.status))}>
          {PURCHASE_STATUS_LABEL[p.status]}
        </span>
      </div>

      <div className="rounded-lg bg-[#FFEFF8] p-3 text-[12px] text-ink/55">
        <p>
          Émise : {formatPurchaseDate(p.createdAt) ?? "—"}
          {p.orderedAt ? ` · Commandée : ${formatPurchaseDate(p.orderedAt)}` : ""}
          {p.receivedAt ? ` · Reçue : ${formatPurchaseDate(p.receivedAt)}` : ""}
        </p>
        {!financeHidden ? (
          <p className="mt-0.5 font-semibold text-ink">Total {formatMad(p.total)}</p>
        ) : null}
      </div>

      {loading && !detail ? (
        <p className="text-[12px] text-ink/40">Chargement des lignes…</p>
      ) : null}

      {detail ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Pointage produits</p>
          {detail.items.map((item) => {
            const gap = item.quantityOrdered - item.quantityReceived;
            const ok = gap <= 0;
            return (
              <div
                key={item.id}
                className={cn("space-y-2 rounded-xl p-3", ok ? "bg-[#FFEFF8]" : "bg-[#FFDAD6]/40")}
              >
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/products/${item.productId}/`} className="truncate text-[13px] font-bold text-ink">
                    {item.productName}
                  </Link>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      ok ? "bg-emerald-100 text-emerald-800" : "bg-[#FFDAD6] text-[#93000A]",
                    )}
                  >
                    {ok ? "Conforme" : `Reste ${formatQty(item.quantityRemaining, item.unit)}`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                  <div className="rounded-lg bg-white p-1.5">
                    <span className="block text-ink/40">Commandé</span>
                    <span className="font-bold text-ink">{formatQty(item.quantityOrdered, item.unit)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-1.5">
                    <span className="block text-ink/40">Reçu</span>
                    <span className="font-bold text-ink">{formatQty(item.quantityReceived, item.unit)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-1.5">
                    <span className="block text-ink/40">Écart</span>
                    <span className={cn("font-bold", gap > 0 ? "text-[#BA1A1A]" : "text-emerald-700")}>
                      {gap === 0 ? "0" : `-${formatQty(gap, item.unit)}`}
                    </span>
                  </div>
                </div>
                {canReceive && item.quantityRemaining > 0 ? (
                  <label className="text-[12px]">
                    <span className="mb-1 block text-ink/45">Quantité à pointer</span>
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
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] text-ink/45">{p.itemCount} référence{p.itemCount > 1 ? "s" : ""} — ouvrez la fiche pour le détail.</p>
      )}

      <p className="rounded-lg bg-[#F6E3EF] p-3 text-[12px] leading-relaxed text-ink/60">
        <strong className="text-ink">Règle de stock :</strong> seules les quantités reçues créent un mouvement d’entrée. Le reliquat reste ouvert jusqu’à un prochain pointage.
      </p>

      {canReceive ? (
        <button
          type="button"
          disabled={submitting || !detail}
          onClick={() => void handleReceive()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {submitting ? "Réception…" : "Valider la réception"}
        </button>
      ) : null}

      {onOpenFull ? (
        <button
          type="button"
          onClick={onOpenFull}
          className="text-center text-[12px] font-semibold text-primary hover:underline"
        >
          Fiche complète
        </button>
      ) : (
        <Link href={`/purchases/${p.id}/`} className="text-center text-[12px] font-semibold text-primary hover:underline">
          Fiche complète
        </Link>
      )}
    </div>
  );
}
