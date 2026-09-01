"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canWriteCashRegister } from "@/lib/rbac";
import {
  formatMad,
  getInvoice,
  INVOICE_STATUS_LABEL,
  voidInvoice,
} from "@/modules/invoices/service";
import type { InvoiceDetail } from "@/types/invoice";

export function InvoiceDetailView({ invoiceId }: { invoiceId: string }) {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteCashRegister(user.role);

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setInvoice(await getInvoice(invoiceId));
    } catch {
      toast("Facture introuvable.", "error");
      setInvoice(null);
    }
  }, [invoiceId, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <div className="surface p-8 text-center text-sm text-ink/50">Chargement…</div>;
  }
  if (!invoice) {
    return (
      <div className="surface p-8 text-center">
        <Link href="/invoices/" className="text-sm font-semibold text-primary">
          ← Factures
        </Link>
      </div>
    );
  }

  async function handleVoid() {
    setSubmitting(true);
    const result = await voidInvoice(invoiceId, { reason: voidReason });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setInvoice(result.invoice);
    setVoidOpen(false);
    toast("Facture annulée (VOID).", "success");
  }

  function handlePrint() {
    window.print();
  }

  const inv = invoice;

  function handleDownload() {
    // HTML snapshot téléchargeable (V1) — impression → PDF via navigateur
    const html = document.getElementById("invoice-print")?.innerHTML ?? "";
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.number}</title>`,
        `<style>
          body{font-family:Georgia,serif;color:#1a1a1a;padding:32px;max-width:720px;margin:0 auto}
          table{width:100%;border-collapse:collapse;margin-top:24px}
          th,td{text-align:left;padding:8px 0;border-bottom:1px solid #e8e0e3}
          .total{font-weight:700;font-size:1.1rem}
          .muted{color:#666;font-size:12px}
        </style></head><body>${html}</body></html>`,
      ],
      { type: "text/html;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const text = [
      `${inv.orgNameSnapshot}`,
      `Facture ${inv.number}`,
      `Cliente : ${inv.customerNameSnapshot}`,
      ...inv.items.map(
        (i) => `${i.nameSnapshot} × ${i.quantity} = ${formatMad(i.total)}`,
      ),
      `TOTAL ${formatMad(inv.total)}`,
      `Payé ${formatMad(inv.paidAmount)} · Reste ${formatMad(inv.remaining)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast("Ticket copié — collez-le dans WhatsApp.", "success");
    } catch {
      toast("Impossible de copier.", "error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/invoices/" className="text-sm text-primary">
          ← Factures
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={handleDownload}>
            Télécharger
          </Button>
          <Button type="button" variant="ghost" onClick={handlePrint}>
            Imprimer / PDF
          </Button>
          <Button type="button" variant="ghost" onClick={handleShare}>
            Envoyer (copier)
          </Button>
          {canWrite && invoice.status !== "VOID" ? (
            <Button type="button" variant="ghost" onClick={() => setVoidOpen(true)}>
              Annuler
            </Button>
          ) : null}
        </div>
      </div>

      <div id="invoice-print" className="surface mx-auto max-w-2xl p-6 md:p-8">
        <div className="flex flex-col gap-1 border-b border-line pb-4">
          <p className="font-display text-2xl font-semibold">{invoice.orgNameSnapshot}</p>
          {invoice.orgIceSnapshot ? (
            <p className="text-xs text-ink/50">ICE {invoice.orgIceSnapshot}</p>
          ) : null}
          {invoice.orgAddressSnapshot ? (
            <p className="text-sm text-ink/60">{invoice.orgAddressSnapshot}</p>
          ) : null}
          {invoice.orgPhoneSnapshot ? (
            <p className="text-sm text-ink/60">{invoice.orgPhoneSnapshot}</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-primary">{invoice.number}</p>
            <p className="text-sm text-ink/50">
              {INVOICE_STATUS_LABEL[invoice.status]}
              {invoice.issuedAt
                ? ` · ${new Date(invoice.issuedAt).toLocaleDateString("fr-FR")}`
                : ""}
            </p>
          </div>
          <div className="text-sm">
            <p className="font-medium">Cliente</p>
            <p>{invoice.customerNameSnapshot}</p>
            {invoice.customerPhoneSnapshot ? (
              <p className="text-ink/50">{invoice.customerPhoneSnapshot}</p>
            ) : null}
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase text-ink/40">
              <th className="py-2 text-left font-medium">Prestation</th>
              <th className="py-2 text-right font-medium">Qté</th>
              <th className="py-2 text-right font-medium">Prix</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-line">
                <td className="py-3">
                  {item.nameSnapshot}
                  {item.discount > 0 ? (
                    <span className="mt-0.5 block text-xs text-ink/45">
                      Remise −{formatMad(item.discount)}
                    </span>
                  ) : null}
                </td>
                <td className="py-3 text-right font-mono">{item.quantity}</td>
                <td className="py-3 text-right font-mono">
                  {formatMad(item.unitPriceSnapshot)}
                </td>
                <td className="py-3 text-right font-mono">{formatMad(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {invoice.discountTotal > 0 ? (
          <p className="mt-4 flex justify-between text-sm text-ink/60">
            <span>Promotion / remise</span>
            <span className="font-mono">−{formatMad(invoice.discountTotal)}</span>
          </p>
        ) : null}

        <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          <p className="flex justify-between font-display text-lg font-semibold">
            <span>TOTAL</span>
            <span className="font-mono">{formatMad(invoice.total)}</span>
          </p>
          <p className="flex justify-between">
            <span>Payé</span>
            <span className="font-mono">{formatMad(invoice.paidAmount)}</span>
          </p>
          <p className="flex justify-between">
            <span>Reste</span>
            <span className="font-mono">{formatMad(invoice.remaining)}</span>
          </p>
          {invoice.paymentMethods.length > 0 ? (
            <p className="text-xs text-ink/45">
              Modes : {invoice.paymentMethods.join(", ")}
            </p>
          ) : null}
        </div>

        {invoice.notes ? (
          <p className="mt-6 text-xs text-ink/50">Notes · {invoice.notes}</p>
        ) : null}
        {invoice.status === "VOID" && invoice.voidReason ? (
          <p className="mt-4 text-sm text-red-600">Annulée · {invoice.voidReason}</p>
        ) : null}
      </div>

      <Drawer open={voidOpen} onClose={() => setVoidOpen(false)} title="Annuler la facture">
        <div className="space-y-4">
          <p className="text-sm text-ink/60">
            La facture passera en VOID — pas de suppression destructive.
          </p>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Motif *</span>
            <Input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              required
            />
          </label>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={submitting || !voidReason.trim()}
            onClick={handleVoid}
          >
            Confirmer l&apos;annulation
          </Button>
        </div>
      </Drawer>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print,
          #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
