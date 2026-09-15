import type { Metadata } from "next";
import { ExpensesPageView } from "@/components/expenses/expenses-page";

export const metadata: Metadata = { title: "Dépenses" };

/** Page registre des dépenses (contrôle budgétaire). */
export default function ExpensesPage() {
  return <ExpensesPageView />;
}


