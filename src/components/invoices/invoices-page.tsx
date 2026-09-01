"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppPageHeader, Kpi } from "@/components/app/AppUi";
import { DataCard, ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useToast } from "@/components/ui/toast";
import {
  formatMad,
  INVOICE_STATUS_LABEL,
  listInvoices,
} from "@/modules/invoices/service";
import type { InvoiceKpis, InvoiceListItem, InvoiceStatus } from "@/types/invoice";
import { INVOICE_STATUSES } from "@/types/invoice";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS } from "@/types/finance";

export function InvoicesPageView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [rows, setRows] = useState<InvoiceListItem[]>([]);
  const [kpis, setKpis] = useState<InvoiceKpis | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listInvoices({
        search,
        status: status || undefined,
        method: method || undefined,
        limit: 40,
      });
      setRows(res.data);
      setKpis(res.kpis);
    } catch {
      toast("Impossible de charger les factures.", "error");
    }
  }, [search, status, method, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Factures & tickets"
        description="Numérotation serveur FAC-YYYY-NNNNNN · prix figés (snapshots)."
      />

      {kpis ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="CA facturé" value={formatMad(kpis.billedTotal)} />
          <Kpi label="Payé" value={formatMad(kpis.paidTotal)} />
          <Kpi label="Impayé" value={formatMad(kpis.unpaidTotal)} />
          <Kpi label="Factures du mois" value={String(kpis.monthCount)} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="N° ou cliente…"
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABEL[s as InvoiceStatus]}
            </option>
          ))}
        </select>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous paiements</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABEL[m]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-ink/50">
          Aucune facture — elles sont créées à la finalisation du RDV.
        </div>
      ) : (
        <ResponsiveTable
          headers={["N° facture", "Cliente", "Total", "Payé", "Statut"]}
          minWidthClass="min-w-[720px]"
          cards={rows.map((inv) => (
            <DataCard
              key={inv.id}
              href={`/invoices/${inv.id}/`}
              title={inv.number}
              subtitle={inv.customerName}
              meta={
                <>
                  <span className="font-mono">{formatMad(inv.total)}</span>
                  <br />
                  <span>{INVOICE_STATUS_LABEL[inv.status]}</span>
                </>
              }
            />
          ))}
        >
          {rows.map((inv) => (
            <tr key={inv.id} className="hover:bg-[#FBF4F6]/50">
              <td className="px-4 py-3">
                <Link href={`/invoices/${inv.id}/`} className="font-mono text-sm text-primary">
                  {inv.number}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm">{inv.customerName}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(inv.total)}</td>
              <td className="px-4 py-3 font-mono text-sm">{formatMad(inv.paidAmount)}</td>
              <td className="px-4 py-3 text-sm">{INVOICE_STATUS_LABEL[inv.status]}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
    </motion.div>
  );
}
