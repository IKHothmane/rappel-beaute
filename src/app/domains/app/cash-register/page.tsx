import type { Metadata } from "next";
import { CashRegisterPageView } from "@/components/finance/cash-register-page";

export const metadata: Metadata = { title: "Caisse" };

export default function CashRegisterPage() {
  return <CashRegisterPageView />;
}
