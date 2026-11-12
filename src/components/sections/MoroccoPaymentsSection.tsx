"use client";

import { useEffect, useRef, useState } from "react";
import { DeferredReceiptPrinter } from "@/components/sections/DeferredReceiptPrinter";
import "./morocco-payments.css";
import { Banknote, Check, Coins, CreditCard, MessageCircle, Wallet } from "lucide-react";

const features = [
  {
    title: "Montants en dirhams",
    description: "Prix, caisse, commissions et rapports en MAD, sans conversion.",
    icon: Coins,
  },
  {
    title: "Espèces, carte et virement",
    description: "Fond de caisse, sorties et clôture avec rapprochement des espèces comptées.",
    icon: CreditCard,
  },
  {
    title: "WhatsApp d'abord",
    description: "Rappels, confirmations et promotions sur le canal que vos clientes lisent.",
    icon: MessageCircle,
  },
];

const RECEIPT_ITEMS = [
  { name: "Massage relaxant à l'argan", qty: 1, price: 250 },
  { name: "Épilation sourcils au fil", qty: 1, price: 60 },
  { name: "Soin hydrafacial visage", qty: 1, price: 160 },
];

const PRINTER_LABELS = {
  idle: "Appuyez sur PRINT",
  printing: "Impression… appuyez pour arrêter",
  ready: "Tirez pour détacher, ou imprimez encore",
};

export default function MoroccoPaymentsSection() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [print, setPrint] = useState(false);

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setPrint(true);
        observer.disconnect();
      },
      { threshold: 0.55 },
    );
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="maroc"
      aria-labelledby="morocco-payments-heading"
      className="morocco-payments relative isolate overflow-x-clip bg-vt-surface py-[var(--vt-space-3p5rem)] lg:py-[var(--vt-space-4rem)]"
    >
      <div className="morocco-layout mx-auto grid max-w-[var(--vt-size-1200px)] items-center gap-[var(--vt-space-2rem)] px-[var(--vt-space-1p5rem)] lg:grid-cols-2 lg:gap-[var(--vt-space-2p5rem)] lg:px-[var(--vt-space-2rem)]">
        {/* Texte et fonctionnalités */}
        <div>
          <span className="inline-flex items-center gap-[var(--vt-size-0p5rem)] rounded-full border border-pink-200 bg-white/80 px-[var(--vt-space-1rem)] py-[var(--vt-size-0p5rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] font-bold uppercase tracking-widest text-vt-primary-rich">
            <Wallet aria-hidden="true" size={16} />
            Conçu au Maroc
          </span>

          <h2
            ref={headingRef}
            id="morocco-payments-heading"
            className="mt-[var(--vt-space-1p5rem)] font-serif font-semibold leading-[1.12] tracking-tight text-vt-ink-deep"
          >
            Pensé pour la façon
            <br />
            dont <span className="italic text-vt-primary-rich">vous encaissez</span>
          </h2>

          <p className="mt-[var(--vt-space-1p5rem)] max-w-[var(--vt-size-550px)] text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] leading-8 text-[#765569] sm:text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)]">
            Rappel Beauty part de la réalité d’un institut marocain, pas d’un logiciel européen
            traduit à la hâte.
          </p>

          <div className="mt-[var(--vt-space-2p25rem)] space-y-[var(--vt-space-1rem)]">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group flex items-center gap-[var(--vt-size-0p5rem)] rounded-[14px] border border-[#efd9e2] bg-white/85 p-3 shadow-[0_8px_28px_rgba(105,25,65,0.04)] backdrop-blur-sm"
                  style={{
                    transitionDelay: `${index * 60}ms`,
                  }}
                >
                  <div className="flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-[0.55rem] bg-vt-surface-soft text-vt-primary-rich">
                    <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[0.95rem] font-bold leading-tight text-vt-ink-deep">{feature.title}</h3>
                    <p className="mt-1 text-[0.8125rem] leading-snug text-[#7b596b]">{feature.description}</p>
                  </div>

                  <span className="hidden h-[var(--vt-size-2p25rem)] w-[var(--vt-size-2p25rem)] shrink-0 items-center justify-center rounded-full bg-vt-surface-soft text-vt-primary-rich sm:flex">
                    <Check aria-hidden="true" size={19} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Machine à tickets */}
        <div className="relative mx-auto flex w-full max-w-[var(--vt-size-600px)] flex-col items-center pt-[var(--vt-space-1p5rem)]">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[12%] h-[var(--vt-size-420px)] w-[var(--vt-size-420px)] max-w-full -translate-x-1/2 rounded-full bg-pink-200/55 blur-3xl"
          />

          <div className="relative z-10 flex w-full flex-col items-center">
            <div className="h-[var(--vt-printer-height)] w-full max-w-[var(--vt-printer-width)]">
              <DeferredReceiptPrinter
                embedded
                autoPrint={print}
                store="Institut Royal"
                address="Aicha Chahbi · Ticket de caisse"
                items={RECEIPT_ITEMS}
                currency="MAD"
                currencyPosition="suffix"
                taxRate={0}
                thanks="MERCI"
                startOrder={317}
                dateLocale="fr-FR"
                mark="Rappel"
                labels={PRINTER_LABELS}
              />
            </div>

            {/* Informations */}
            <div className="relative z-10 mt-[var(--vt-space-2rem)] flex max-w-full items-center gap-[var(--vt-space-0p75rem)] rounded-2xl border border-pink-200 bg-white/90 px-[var(--vt-space-1p25rem)] py-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-[#60384c] shadow-sm">
              <span className="rounded-full bg-vt-surface-soft p-[var(--vt-size-0p5rem)] text-vt-primary-rich">
                <Banknote aria-hidden="true" size={20} />
              </span>
              <span>
                Praticienne : <strong>Nadia B.</strong>
                <br />
                Commission <strong className="text-vt-primary-rich">12 %</strong> calculée
                automatiquement
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
