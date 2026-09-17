"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type TarifFaqItem = {
  question: string;
  answer: string;
};

function FAQItem({ question, answer }: TarifFaqItem) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-[#EEDFE7] bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-ink">{question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-primary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-[#F3E7ED] px-5 pb-5 pt-4">
          <p className="text-sm leading-6 text-ink/55">{answer}</p>
        </div>
      )}
    </div>
  );
}

export function TarifsFaq({ items }: { items: readonly TarifFaqItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((faq) => (
        <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
      ))}
    </div>
  );
}
