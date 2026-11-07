import type { Metadata } from "next";
import { ExpensesPageView } from "@/components/expenses/expenses-page";

export const metadata: Metadata = { title: "Dépenses" };

export default function ExpensesPage() {
  return <ExpensesPageView />;
}
