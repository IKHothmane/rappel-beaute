import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceLedgerPage } from "@/components/finance/finance-ledger-page";

export const metadata: Metadata = { title: "Caisse & paiements" };

export default function CashRegisterPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-ink/45">Chargement…</p>}>
      <FinanceLedgerPage />
    </Suspense>
  );
}
