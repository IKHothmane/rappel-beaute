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
          <div className="faq-badge mb-[var(--vt-space-2rem)] inline-flex items-center gap-[var(--vt-space-0p75rem)] rounded-full border border-vt-line bg-vt-surface-soft px-[var(--vt-space-1p25rem)] py-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-bold uppercase tracking-wider text-vt-primary">
            <CircleHelp aria-hidden="true" size={19} />
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

          <p className="mt-[var(--vt-space-2p5rem)] max-w-[var(--vt-size-28rem)] text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)] leading-8 text-[#795c6a]">
            Une autre question ? Retrouvez toutes les réponses dans la{" "}
            <Link href="/faq/" className="font-semibold text-vt-primary hover:underline">
              FAQ
            </Link>{" "}
            ou{" "}
            <Link href="/contact/" className="font-semibold text-vt-primary hover:underline">
              écrivez-nous.
            </Link>
          </p>

          <div className="mt-[var(--vt-space-2p25rem)] flex flex-wrap gap-[var(--vt-space-0p75rem)]">
            <Link
              href="/faq/"
              className="faq-cta inline-flex min-h-[var(--vt-size-52px)] items-center justify-center gap-[var(--vt-space-0p75rem)] rounded-xl bg-vt-primary px-[var(--vt-space-1p5rem)] py-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-bold text-white shadow-[0_12px_30px_-14px_#c50050] transition-all duration-300 hover:-translate-y-1 hover:bg-vt-primary-strong"
            >
              <CircleHelp aria-hidden="true" size={19} />
              Voir la FAQ complète
              <ArrowRight aria-hidden="true" size={17} />
            </Link>

            <Link
              href="/contact/"
              className="faq-cta inline-flex min-h-[var(--vt-size-52px)] items-center justify-center gap-[var(--vt-size-0p5rem)] rounded-xl border border-vt-line bg-white px-[var(--vt-space-1p5rem)] py-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-bold text-vt-primary transition-all duration-300 hover:-translate-y-1 hover:bg-vt-surface-soft"
            >
              <MessageCircle aria-hidden="true" size={19} />
              Nous contacter
            </Link>
          </div>

          {/* Décoration optionnelle */}
          <div className="pointer-events-none relative mt-[var(--vt-space-2p5rem)] hidden h-[var(--vt-size-12rem)] overflow-hidden rounded-[var(--vt-size-28px)] bg-gradient-to-br from-vt-surface-pink via-vt-surface-soft to-vt-line lg:block">
            <div className="absolute -bottom-20 -left-10 h-[var(--vt-size-13rem)] w-[var(--vt-size-13rem)] rounded-full bg-[#efb4cb]/50 blur-2xl" />
            <div className="absolute right-[var(--vt-size-2rem)] top-[var(--vt-space-2rem)] flex h-[var(--vt-size-4rem)] w-[var(--vt-size-4rem)] items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-vt-primary shadow-sm">
              <MessageCircle aria-hidden="true" size={30} />
            </div>
            <div className="absolute bottom-[var(--vt-space-2rem)] left-[var(--vt-size-2rem)]">
              <p className="font-serif text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)] text-vt-ink-deep">
                Votre institut,
                <br />
                notre priorité.
              </p>
            </div>
          </div>
        </div>

        {/* Colonne droite : accordéon */}
        <div className="rounded-[var(--vt-size-30px)] border border-[#f2dce4] bg-white/90 p-[var(--vt-space-0p75rem)] shadow-[0_20px_65px_-30px_rgba(100,20,60,0.18)] backdrop-blur-sm sm:p-[var(--vt-space-1p25rem)]">
          <div className="space-y-[var(--vt-space-0p75rem)]">
            {faqs.map((faq, index) => {
              const isOpen = activeIndex === index;
              const Icon = FAQ_ICONS[faq.icon];
              const panelId = `faq-panel-${index}`;

              return (
                <article
                  key={faq.question}
                  className={`overflow-hidden rounded-[var(--vt-size-22px)] border transition-all duration-300 ${
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
                      className="flex w-full items-center gap-[var(--vt-space-1rem)] px-[var(--vt-space-1rem)] py-[var(--vt-space-1rem)] text-left sm:px-[var(--vt-space-1p25rem)]"
                    >
                      <span className="faq-question-icon flex h-[var(--vt-size-3rem)] w-[var(--vt-size-3rem)] shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary">
                        <Icon aria-hidden="true" size={23} strokeWidth={1.9} />
                      </span>

                      <span className="faq-question-text flex-1 text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] font-semibold leading-6 text-vt-ink-deep sm:text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)]">
                        {faq.question}
                      </span>

                      <span className="faq-question-toggle flex h-[var(--vt-size-2p25rem)] w-[var(--vt-size-2p25rem)] shrink-0 items-center justify-center rounded-full bg-vt-surface-soft text-vt-primary">
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
