"use client";

import { ExpenseDetailView } from "@/components/expenses/expense-detail-view";

type Props = { params: { id: string } };

export default function ExpenseDetailPage({ params }: Props) {
  return <ExpenseDetailView expenseId={params.id} />;
}
