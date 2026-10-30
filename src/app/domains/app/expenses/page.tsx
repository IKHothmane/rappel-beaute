import { redirect } from "next/navigation";

/** Ancienne adresse : la page unique est /payments/. */
export default function ExpensesPage() {
  redirect("/payments/?vue=depenses");
}
