"use client";

import { useState } from "react";
import Link from "next/link";
import { HOME_FAQS as faqs } from "@/lib/home-faq";
import "./faq-section.css";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Gift,
  Handshake,
  Laptop,
  MessageCircle,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

const FAQ_ICONS = {
  CalendarDays,
  CreditCard,
  Gift,
  Handshake,
  Laptop,
  MessageCircle,
  ShieldCheck,
  Users,
};

export default function FaqSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="home-faq-heading"
      className="faq-section relative isolate overflow-hidden bg-vt-surface px-[var(--vt-space-1p5rem)] py-[var(--vt-space-3p5rem)] lg:py-[var(--vt-space-4rem)]"
    >
      {/* Fond décoratif */}

      <div className="faq-layout mx-auto grid max-w-[var(--vt-size-1200px)] items-start gap-[var(--vt-space-2rem)] lg:grid-cols-[0.8fr_1.2fr] lg:gap-[var(--vt-space-2p5rem)]">
        {/* Colonne gauche */}
        <div className="lg:sticky lg:top-[var(--vt-space-7rem)]">
          <div className="faq-badge mb-3 inline-flex items-center gap-2 rounded-full border border-vt-line bg-vt-surface-soft px-3 py-1.5 text-[0.75rem] font-bold uppercase tracking-wider text-vt-primary">
            <CircleHelp aria-hidden="true" size={14} />
            Questions fréquentes
          </div>

          <h2
            id="home-faq-heading"
            className="font-serif font-semibold leading-[1.08] tracking-tight text-vt-ink-deep"
          >
            Avant de vous
            <span className="relative mt-[var(--vt-size-0p25rem)] block w-fit">
              lancer
              <span className="absolute -bottom-3 left-[var(--vt-size-0rem)] h-[var(--vt-size-4px)] w-full -rotate-2 rounded-full bg-vt-primary-bright" />
            </span>
          </h2>

          <p className="mt-4 max-w-[var(--vt-size-28rem)] text-[0.9375rem] leading-snug text-[#795c6a]">
            Une autre question ? Retrouvez toutes les réponses dans la{" "}
            <Link href="/faq/" className="font-semibold text-vt-primary hover:underline">
              FAQ
            </Link>{" "}
            ou{" "}
            <Link href="/contact/" className="font-semibold text-vt-primary hover:underline">
              écrivez-nous.
            </Link>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/faq/"
              className="faq-cta inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-vt-primary px-4 py-2 text-[0.875rem] font-bold text-white shadow-[0_12px_30px_-14px_#c50050] hover:bg-vt-primary-strong"
            >
              <CircleHelp aria-hidden="true" size={15} />
              Voir la FAQ complète
              <ArrowRight aria-hidden="true" size={17} />
            </Link>

            <Link
              href="/contact/"
              className="faq-cta inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-vt-line bg-white px-4 py-2 text-[0.875rem] font-bold text-vt-primary hover:bg-vt-surface-soft"
            >
              <MessageCircle aria-hidden="true" size={15} />
              Nous contacter
            </Link>
          </div>

          {/* Décoration optionnelle */}
          <div className="pointer-events-none relative mt-4 hidden h-24 overflow-hidden rounded-[14px] bg-gradient-to-br from-vt-surface-pink via-vt-surface-soft to-vt-line lg:block">
            <div className="absolute -bottom-20 -left-10 h-[var(--vt-size-13rem)] w-[var(--vt-size-13rem)] rounded-full bg-[#efb4cb]/50 blur-2xl" />
            <div className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-[0.55rem] border border-white/80 bg-white/70 text-vt-primary shadow-sm">
              <MessageCircle aria-hidden="true" size={15} />
            </div>
            <div className="absolute bottom-3 left-4">
              <p className="font-serif text-[0.95rem] leading-tight text-vt-ink-deep">
                Votre institut,
                <br />
                notre priorité.
              </p>
            </div>
          </div>
        </div>

        {/* Colonne droite : accordéon */}
        <div className="rounded-[14px] border border-[#f2dce4] bg-white/90 p-2 shadow-[0_20px_65px_-30px_rgba(100,20,60,0.18)] backdrop-blur-sm">
          <div className="space-y-1.5">
            {faqs.map((faq, index) => {
              const isOpen = activeIndex === index;
              const Icon = FAQ_ICONS[faq.icon];
              const panelId = `faq-panel-${index}`;

              return (
                <article
                  key={faq.question}
                  className={`overflow-hidden rounded-[12px] border ${
                    isOpen
                      ? "border-vt-surface-pink bg-gradient-to-br from-vt-surface-soft to-vt-surface shadow-sm"
                      : "border-vt-surface-soft bg-white hover:border-vt-line-strong hover:bg-vt-surface"
                  }`}
                >
                  <h3>
                    <button
                      id={`faq-trigger-${index}`}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setActiveIndex(isOpen ? null : index)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left"
                    >
                      <span className="faq-question-icon flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-[0.55rem] bg-vt-surface-soft text-vt-primary">
                        <Icon aria-hidden="true" size={15} strokeWidth={1.8} />
                      </span>

                      <span className="faq-question-text min-w-0 flex-1 text-[0.95rem] font-semibold leading-tight text-vt-ink-deep">
                        {faq.question}
                      </span>

                      <span className="faq-question-toggle flex h-[1.75rem] w-[1.75rem] shrink-0 items-center justify-center rounded-full bg-vt-surface-soft text-vt-primary">
                        {isOpen ? (
                          <ChevronDown
                            aria-hidden="true"
                            size={20}
                            className="rotate-180 transition-transform"
                          />
                        ) : (
                          <Plus aria-hidden="true" size={20} />
                        )}
                      </span>
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={`faq-trigger-${index}`}
                    aria-hidden={!isOpen}
                    data-open={isOpen}
                    className="faq-answer"
                  >
                    <div className="faq-answer-inner">
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
