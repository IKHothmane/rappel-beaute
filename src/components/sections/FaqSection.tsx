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
      className="faq-section relative isolate overflow-hidden bg-vt-surface px-6 py-14 lg:py-16"
    >
      {/* Fond décoratif */}

      <div className="faq-layout mx-auto grid max-w-[1200px] items-start gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
        {/* Colonne gauche */}
        <div className="lg:sticky lg:top-28">
          <div className="faq-badge mb-8 inline-flex items-center gap-3 rounded-full border border-vt-line bg-vt-surface-soft px-5 py-3 text-sm font-bold uppercase tracking-wider text-vt-primary">
            <CircleHelp aria-hidden="true" size={19} />
            Questions fréquentes
          </div>

          <h2
            id="home-faq-heading"
            className="font-serif font-semibold leading-[1.08] tracking-tight text-vt-ink-deep"
          >
            Avant de vous
            <span className="relative mt-1 block w-fit">
              lancer
              <span className="absolute -bottom-3 left-0 h-[4px] w-full -rotate-2 rounded-full bg-vt-primary-bright" />
            </span>
          </h2>

          <p className="mt-10 max-w-md text-lg leading-8 text-[#795c6a]">
            Une autre question ? Retrouvez toutes les réponses dans la{" "}
            <Link href="/faq/" className="font-semibold text-vt-primary hover:underline">
              FAQ
            </Link>{" "}
            ou{" "}
            <Link href="/contact/" className="font-semibold text-vt-primary hover:underline">
              écrivez-nous.
            </Link>
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/faq/"
              className="faq-cta inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-vt-primary px-6 py-4 text-sm font-bold text-white shadow-[0_12px_30px_-14px_#c50050] transition-all duration-300 hover:-translate-y-1 hover:bg-vt-primary-strong"
            >
              <CircleHelp aria-hidden="true" size={19} />
              Voir la FAQ complète
              <ArrowRight aria-hidden="true" size={17} />
            </Link>

            <Link
              href="/contact/"
              className="faq-cta inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-vt-line bg-white px-6 py-4 text-sm font-bold text-vt-primary transition-all duration-300 hover:-translate-y-1 hover:bg-vt-surface-soft"
            >
              <MessageCircle aria-hidden="true" size={19} />
              Nous contacter
            </Link>
          </div>

          {/* Décoration optionnelle */}
          <div className="pointer-events-none relative mt-10 hidden h-48 overflow-hidden rounded-[28px] bg-gradient-to-br from-vt-surface-pink via-vt-surface-soft to-vt-line lg:block">
            <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-[#efb4cb]/50 blur-2xl" />
            <div className="absolute right-8 top-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-vt-primary shadow-sm">
              <MessageCircle aria-hidden="true" size={30} />
            </div>
            <div className="absolute bottom-8 left-8">
              <p className="font-serif text-2xl text-vt-ink-deep">
                Votre institut,
                <br />
                notre priorité.
              </p>
            </div>
          </div>
        </div>

        {/* Colonne droite : accordéon */}
        <div className="rounded-[30px] border border-[#f2dce4] bg-white/90 p-3 shadow-[0_20px_65px_-30px_rgba(100,20,60,0.18)] backdrop-blur-sm sm:p-5">
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeIndex === index;
              const Icon = FAQ_ICONS[faq.icon];
              const panelId = `faq-panel-${index}`;

              return (
                <article
                  key={faq.question}
                  className={`overflow-hidden rounded-[22px] border transition-all duration-300 ${
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
                      className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
                    >
                      <span className="faq-question-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary">
                        <Icon aria-hidden="true" size={23} strokeWidth={1.9} />
                      </span>

                      <span className="faq-question-text flex-1 text-base font-semibold leading-6 text-vt-ink-deep sm:text-lg">
                        {faq.question}
                      </span>

                      <span className="faq-question-toggle flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vt-surface-soft text-vt-primary">
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
