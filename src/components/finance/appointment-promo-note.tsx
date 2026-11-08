"use client";

import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMad } from "@/modules/finance/service";
import { listPromotions } from "@/modules/promo/service";
import {
  PROMOTION_TYPE_LABEL,
  type PromotionListItem,
} from "@/types/promo";
import { cn } from "@/lib/utils";

type Props = {
  promotionCode?: string | null;
  promotionName?: string | null;
  discount?: number;
  /** Permet de saisir / choisir un code qui s’applique uniquement au service. */
  canApply?: boolean;
  disabled?: boolean;
  serviceId?: string | null;
  onApply?: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function promoHint(promo: PromotionListItem): string {
  if (promo.type === "PERCENTAGE" && promo.value != null) return `−${promo.value} %`;
  if (promo.type === "FREE_SERVICE") return "Soin offert";
  if (promo.value != null) return `−${formatMad(promo.value)}`;
  return PROMOTION_TYPE_LABEL[promo.type];
}

export function AppointmentPromoNote({
  promotionCode,
  promotionName,
  discount = 0,
  canApply = false,
  disabled = false,
  serviceId,
  onApply,
}: Props) {
  const code = promotionCode?.trim();
  const [promoCode, setPromoCode] = useState("");
  const [promos, setPromos] = useState<PromotionListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canApply || code || !onApply) return;
    let cancelled = false;
    void listPromotions({ status: "ACTIVE", limit: 80 })
      .then((res) => {
        if (cancelled) return;
        setPromos(
          res.data.filter((promo) => {
            if (!promo.code?.trim()) return false;
            if (promo.serviceId && serviceId && promo.serviceId !== serviceId) return false;
            return true;
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setPromos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canApply, code, onApply, serviceId]);

  if (code) {
    return (
      <p className="rounded-lg bg-[#FFEFF8] px-3 py-2 text-[13px] text-ink">
        Code promo service <strong>{code}</strong>
        {promotionName ? <span className="text-ink/55"> · {promotionName}</span> : null}
        {discount > 0.009 ? (
          <span className="text-ink/70"> · réduction {formatMad(discount)} sur la prestation</span>
        ) : null}
      </p>
    );
  }

  if (!canApply || !onApply) return null;

  async function submit(nextCode: string) {
    const trimmed = nextCode.trim();
    if (!trimmed || busy || disabled || !onApply) return;
    setBusy(true);
    setError("");
    try {
      const result = await onApply(trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPromoCode("");
    } catch {
      setError("Impossible d’appliquer ce code. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-primary/25 bg-white p-3">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink/45">
        <Tag size={12} className="text-primary" />
        Code promo service
      </p>
      <p className="text-[12px] text-ink/50">
        S’applique uniquement au rendez-vous / prestation, pas aux produits.
      </p>
      {promos.length > 0 ? (
        <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl bg-[#FFEFF8] p-2">
          {promos.map((promo) => (
            <button
              key={promo.id}
              type="button"
              disabled={disabled || busy}
              onClick={() => void submit(promo.code ?? "")}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-left text-[13px] transition hover:bg-primary/5 disabled:opacity-40"
            >
              <span className="min-w-0">
                <span className="block font-mono text-[12px] font-bold tracking-wide">
                  {promo.code}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink/50">
                  {promo.name} · {promoHint(promo)}
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-primary">Appliquer</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={promoCode}
          onChange={(e) => {
            setPromoCode(e.target.value.toUpperCase());
            if (error) setError("");
          }}
          placeholder="Saisir un code service"
          disabled={disabled || busy}
          className="font-mono uppercase"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy || !promoCode.trim()}
          onClick={() => void submit(promoCode)}
        >
          OK
        </Button>
      </div>
      {error ? <p className={cn("text-[12px] text-red-600")}>{error}</p> : null}
    </div>
  );
}
