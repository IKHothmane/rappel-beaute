"use client";

import { useState } from "react";
import { CashRegisterHero } from "@/components/finance/cash-register-hero";

// Démonstration visuelle uniquement : aucune opération financière réelle.
export default function CashRegisterDemoPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("Démo : aucune transaction n’est enregistrée.");
  return <main className="min-h-screen bg-[#F6F7FA] p-4 md:p-8"><div className="mx-auto max-w-7xl space-y-5"><CashRegisterHero isOpen={isOpen} balance={745} canWrite onOpen={() => { setIsOpen(true); setNotice("Démo : ouverture simulée."); }} onClose={() => { setIsOpen(false); setNotice("Démo : clôture simulée."); }} onPayment={() => setNotice("Relier à votre formulaire d’encaissement existant.")} onWithdrawal={() => setNotice("Relier à votre formulaire de sortie existant.")} onRefund={() => setNotice("Relier à votre formulaire de remboursement existant.")} /><div role="status" className="rounded-2xl border border-pink-100 bg-white p-5 text-sm text-[#54112F]">{notice}</div></div></main>;
}
