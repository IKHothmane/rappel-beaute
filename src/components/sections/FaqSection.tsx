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

const FAQ_ICONS = { CalendarDays, CreditCard, Gift, Handshake, Laptop, MessageCircle, ShieldCheck, Users };


export default function FaqSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="home-faq-heading"
      className="faq-section relative isolate overflow-hidden bg-[#fff8fa] px-5 py-20 sm:px-8 lg:py-28"
    >
      {/* Fond décoratif */}
      

      <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        {/* Colonne gauche */}
        <div className="lg:sticky lg:top-28">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#f4c6d8] bg-[#fff0f5] px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#c50050]">
            <CircleHelp aria-hidden="true" size={19} />
            Questions fréquentes
          </div>

          <h2 id="home-faq-heading" className="font-serif text-5xl font-semibold leading-[1.08] tracking-tight text-[#430b2b] sm:text-6xl">
            Avant de vous
            <span className="relative mt-1 block w-fit">
              lancer
              <span className="absolute -bottom-3 left-0 h-[4px] w-full -rotate-2 rounded-full bg-[#d00055]" />
            </span>
          </h2>

          <p className="mt-10 max-w-md text-lg leading-8 text-[#795c6a]">
            Une autre question ? Retrouvez toutes les réponses
            dans la{" "}
            <Link
              href="/faq/"
              className="font-semibold text-[#c50050] hover:underline"
            >
              FAQ
            </Link>{" "}
            ou{" "}
            <Link
              href="/contact/"
              className="font-semibold text-[#c50050] hover:underline"
            >
              écrivez-nous.
            </Link>
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/faq/"
              className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-[#c50050] px-6 py-4 text-sm font-bold text-white shadow-[0_12px_30px_-14px_#c50050] transition-all duration-300 hover:-translate-y-1 hover:bg-[#a80044]"
            >
              <CircleHelp aria-hidden="true" size={19} />
              Voir la FAQ complète
              <ArrowRight aria-hidden="true" size={17} />
            </Link>

            <Link
              href="/contact/"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#f0c6d6] bg-white px-6 py-4 text-sm font-bold text-[#bd004c] transition-all duration-300 hover:-translate-y-1 hover:bg-[#fff0f5]"
            >
              <MessageCircle aria-hidden="true" size={19} />
              Nous contacter
            </Link>
          </div>

          {/* Décoration optionnelle */}
          <div className="pointer-events-none relative mt-10 hidden h-48 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#fce3ec] via-[#fff1f5] to-[#f7d0df] lg:block">
            <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-[#efb4cb]/50 blur-2xl" />
            <div className="absolute right-8 top-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-[#c50050] shadow-sm">
              <MessageCircle aria-hidden="true" size={30} />
            </div>
            <div className="absolute bottom-8 left-8">
              <p className="font-serif text-2xl text-[#430b2b]">
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
                      ? "border-[#f5d8e3] bg-gradient-to-br from-[#fff0f5] to-[#fff8fa] shadow-sm"
                      : "border-[#f4e2e9] bg-white hover:border-[#eebbd0] hover:bg-[#fffafd]"
                  }`}
                >
                  <h3>
                    <button
                      id={`faq-trigger-${index}`}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() =>
                        setActiveIndex(isOpen ? null : index)
                      }
                      className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fde8f0] text-[#c50050]">
                        <Icon aria-hidden="true" size={23} strokeWidth={1.9} />
                      </span>

                      <span className="flex-1 text-base font-semibold leading-6 text-[#430b2b] sm:text-lg">
                        {faq.question}
                      </span>

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0f5] text-[#c50050]">
                        {isOpen ? (
                          <ChevronDown aria-hidden="true"
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
                    <div className="faq-answer-inner"><p>{faq.answer}</p></div>
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
