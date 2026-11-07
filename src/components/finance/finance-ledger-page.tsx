"use client";

import { CashRegisterPageView } from "@/components/finance/cash-register-page";

import "./finance-premium.css";

/** Page unique Caisse + Paiements (les dépenses restent sur /expenses/). */
export function FinanceLedgerPage() {
  return (
    <main className="finance-premium">
      <div className="finance-premium__container">
        <CashRegisterPageView />
      </div>
    </main>
  );
}
