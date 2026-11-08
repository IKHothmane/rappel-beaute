"use client";

import { useEffect, useState } from "react";
import {
  fetchPaymentBreakdown,
  type PaymentBreakdown,
} from "@/components/finance/payment-breakdown";
import { formatMad } from "@/modules/finance/service";
import type { PaymentItem } from "@/types/finance";
import type { GroupedPaymentItem } from "@/components/finance/payment-helpers";

export function PaymentBreakdownPanel({ payment }: { payment: PaymentItem }) {
  const [breakdown, setBreakdown] = useState<PaymentBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const grouped = payment as GroupedPaymentItem;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPaymentBreakdown(payment)
      .then((detail) => {
        if (!cancelled) setBreakdown(detail);
      })
      .catch(() => {
        if (!cancelled) {
          setBreakdown({ services: [], soldProducts: [], usedProducts: [] });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [payment]);

  return (
    <div className="space-y-3 rounded-xl border border-[#EEDFE7] bg-[#FFF7FB] p-3 text-[13px]">
      {loading ? (
        <p className="text-[12px] text-ink/45">Chargement du détail…</p>
      ) : (
        <>
          <Block
            title="Prestations / services"
            empty="Aucune prestation liée."
            rows={(breakdown?.services ?? []).map((line) => ({
              label: line.name,
              value: line.price != null ? formatMad(line.price) : "—",
            }))}
          />
          <Block
            title="Produits vendus"
            empty="Aucun produit vendu."
            rows={(breakdown?.soldProducts ?? []).map((line) => ({
              label: `${line.name} × ${line.quantity}`,
              value: formatMad(line.lineTotal),
            }))}
          />
          {grouped.groupParts && grouped.groupParts.length > 1 ? (
            <Block
              title="Répartition encaissement"
              empty=""
              rows={grouped.groupParts.map((part) => ({
                label: part.label,
                value: formatMad(Math.abs(part.amount)),
              }))}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function Block({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#981C52]">{title}</p>
      {rows.length === 0 ? (
        empty ? <p className="mt-1 text-[12px] text-ink/45">{empty}</p> : null
      ) : (
        <ul className="mt-1.5 space-y-1">
          {rows.map((row) => (
            <li
              key={`${title}-${row.label}-${row.value}`}
              className="flex items-start justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5"
            >
              <span className="min-w-0 font-medium text-[#3A1528]">{row.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-[#3A1528]">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
