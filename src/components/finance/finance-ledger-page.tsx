"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ExpensesPageView } from "@/components/expenses/expenses-page";
import { PaymentsPageView } from "@/components/finance/payments-page";
import { canAccessNav } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export type MoneySection = "encaissements" | "depenses";

function useMoneySection() {
  const user = useCurrentUser();
  const router = useRouter();
  const params = useSearchParams();
  const canPayments = canAccessNav(user.role, "payments");
  const canExpenses = canAccessNav(user.role, "expenses");
  const asked: MoneySection = params.get("vue") === "depenses" ? "depenses" : "encaissements";
  const section: MoneySection =
    asked === "depenses" && canExpenses ? "depenses" : canPayments ? "encaissements" : "depenses";

  function setSection(next: MoneySection) {
    router.replace(next === "depenses" ? "/payments/?vue=depenses" : "/payments/");
  }

  return { section, setSection, canPayments, canExpenses };
}

function MoneySectionSwitch() {
  const { section, setSection, canPayments, canExpenses } = useMoneySection();
  if (!canPayments || !canExpenses) return null;

  return (
    <div className="flex w-fit rounded-xl bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setSection("encaissements")}
        className={cn(
          "h-10 rounded-lg px-4 text-sm font-semibold",
          section === "encaissements" ? "bg-primary text-white" : "text-ink/60",
        )}
      >
        Encaissements
      </button>
      <button
        type="button"
        onClick={() => setSection("depenses")}
        className={cn(
          "h-10 rounded-lg px-4 text-sm font-semibold",
          section === "depenses" ? "bg-primary text-white" : "text-ink/60",
        )}
      >
        Dépenses
      </button>
    </div>
  );
}

export function FinanceLedgerPage() {
  const { section } = useMoneySection();

  return (
    <div className="flex flex-col gap-4">
      <MoneySectionSwitch />
      {section === "depenses" ? <ExpensesPageView /> : <PaymentsPageView />}
    </div>
  );
}
