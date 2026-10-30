import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceLedgerPage } from "@/components/finance/finance-ledger-page";

export const metadata: Metadata = { title: "Paiements & dépenses" };

export default function PaymentsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-ink/45">Chargement…</p>}>
      <FinanceLedgerPage />
    </Suspense>
  );
}
