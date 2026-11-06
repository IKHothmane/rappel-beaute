"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Plus, ReceiptText } from "lucide-react";

import { useCurrentUser } from "@/components/auth/session-provider";
import { ExpensesPageView } from "@/components/expenses/expenses-page";
import { PaymentsPageView } from "@/components/finance/payments-page";
import {
  canAccessNav,
  canCreateExpense,
  canWriteCashRegister,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

import "./finance-premium.css";

type MoneySection = "encaissements" | "depenses";

const TABS = [
  {
    id: "encaissements" as const,
    label: "Encaissements",
    subtitle: "Paiements et règlements",
    icon: CreditCard,
  },
  {
    id: "depenses" as const,
    label: "Dépenses",
    subtitle: "Charges et suivi budgétaire",
    icon: ReceiptText,
  },
];

function useMoneySection() {
  const user = useCurrentUser();
  const router = useRouter();
  const params = useSearchParams();

  const canPayments = canAccessNav(user.role, "payments");
  const canExpenses = canAccessNav(user.role, "expenses");
  const canWritePayment = canWriteCashRegister(user.role);
  const canWriteExpense = canCreateExpense(user.role);

  const requested: MoneySection =
    params.get("vue") === "depenses" ? "depenses" : "encaissements";

  const section: MoneySection =
    requested === "depenses" && canExpenses
      ? "depenses"
      : canPayments
        ? "encaissements"
        : "depenses";

  function setSection(next: MoneySection) {
    if (next === "encaissements" && !canPayments) return;
    if (next === "depenses" && !canExpenses) return;

    router.replace(next === "depenses" ? "/payments/?vue=depenses" : "/payments/");
  }

  return {
    section,
    setSection,
    canPayments,
    canExpenses,
    canWritePayment,
    canWriteExpense,
    orgName: user.orgName,
  };
}

export function FinanceLedgerPage() {
  const {
    section,
    setSection,
    canPayments,
    canExpenses,
    canWritePayment,
    canWriteExpense,
    orgName,
  } = useMoneySection();

  const [payCreateSignal, setPayCreateSignal] = useState(0);
  const [expenseCreateSignal, setExpenseCreateSignal] = useState(0);

  const isPayments = section === "encaissements";
  const visibleTabs = TABS.filter((item) =>
    item.id === "encaissements" ? canPayments : canExpenses,
  );

  const showCreate =
    (isPayments && canWritePayment) || (!isPayments && canWriteExpense);

  return (
    <main className="finance-premium">
      <div className="finance-premium__container">
        <header className="finance-premium__hero">
          <div className="finance-premium__hero-copy">
            <h1>
              {isPayments ? "Paiements & règlements" : "Dépenses & suivi financier"}
            </h1>
            <p>
              {isPayments
                ? `Suivez vos encaissements, vos règlements et vos rendez-vous depuis un seul espace · ${orgName}`
                : `Pilotez vos charges et gardez une vision claire des dépenses de votre institut · ${orgName}`}
            </p>
          </div>

          {showCreate ? (
            <button
              type="button"
              className="finance-premium__hero-btn"
              onClick={() =>
                isPayments
                  ? setPayCreateSignal((n) => n + 1)
                  : setExpenseCreateSignal((n) => n + 1)
              }
            >
              <Plus size={18} aria-hidden />
              {isPayments ? "Nouveau paiement" : "Nouvelle dépense"}
            </button>
          ) : null}
        </header>

        {visibleTabs.length > 1 ? (
          <nav
            className="finance-premium__tabs"
            data-count={visibleTabs.length}
            aria-label="Navigation financière"
          >
            {visibleTabs.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "finance-premium__tab",
                    active && "finance-premium__tab-active",
                  )}
                >
                  <span className="finance-premium__tab-icon">
                    <Icon size={21} aria-hidden />
                  </span>
                  <span className="finance-premium__tab-text">
                    <strong>{item.label}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  {active ? (
                    <span className="finance-premium__tab-indicator" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        ) : null}

        <section className="finance-premium__workspace">
          {isPayments ? (
            <PaymentsPageView createSignal={payCreateSignal} />
          ) : (
            <ExpensesPageView createSignal={expenseCreateSignal} />
          )}
        </section>
      </div>
    </main>
  );
}
