"use client";

import { Banknote, CreditCard, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  type PaymentMethod,
  type SelectablePaymentMethod,
} from "@/types/finance";

const METHOD_ICON: Record<SelectablePaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  CARD: CreditCard,
  TRANSFER: Landmark,
};

type Props = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function PaymentMethodPicker({
  value,
  onChange,
  disabled = false,
  label = "Méthode",
  className,
}: Props) {
  const selected: SelectablePaymentMethod =
    value === "CASH" || value === "CARD" || value === "TRANSFER" ? value : "CASH";

  return (
    <div className={cn("block text-sm", className)}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-[#FFEFF8] p-1"
        role="radiogroup"
        aria-label={label}
      >
        {PAYMENT_METHODS.map((method) => {
          const Icon = METHOD_ICON[method];
          const active = selected === method;
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(method)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[12px] font-semibold transition-colors",
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink/55 hover:text-ink/80",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-ink/40")} />
              {PAYMENT_METHOD_LABEL[method]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
