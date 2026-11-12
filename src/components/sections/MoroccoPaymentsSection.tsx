"use client";

import { useEffect, useRef, useState } from "react";
import "./morocco-payments.css";
import {
  Banknote,
  Check,
  Coins,
  CreditCard,
  MessageCircle,
  ReceiptText,
  Wallet,
} from "lucide-react";

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

const services = [
  ["Massage relaxant à l'argan", "250,00"],
  ["Épilation sourcils au fil", "60,00"],
  ["Soin hydrafacial visage", "160,00"],
];

export default function MoroccoPaymentsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="maroc"
      aria-labelledby="morocco-payments-heading"
      className="morocco-payments relative isolate overflow-hidden bg-vt-surface py-14 lg:py-16"
    >
      <div className="morocco-layout mx-auto grid max-w-[1200px] items-center gap-8 px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
        {/* Texte et fonctionnalités */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-widest text-vt-primary-rich">
            <Wallet aria-hidden="true" size={16} />
            Conçu au Maroc
          </span>

          <h2
            id="morocco-payments-heading"
            className="mt-6 font-serif font-semibold leading-[1.12] tracking-tight text-vt-ink-deep"
          >
            Pensé pour la façon
            <br />
            dont <span className="italic text-vt-primary-rich">vous encaissez</span>
          </h2>

          <p className="mt-6 max-w-[550px] text-base leading-8 text-[#765569] sm:text-lg">
            Rappel Beauty part de la réalité d’un institut marocain, pas d’un logiciel européen
            traduit à la hâte.
          </p>

          <div className="mt-9 space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group flex items-center gap-4 rounded-2xl border border-[#efd9e2] bg-white/85 p-5 shadow-[0_8px_28px_rgba(105,25,65,0.04)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#e8a8c2] hover:shadow-lg"
                  style={{
                    transitionDelay: `${index * 60}ms`,
                  }}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary-rich">
                    <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-vt-ink-deep">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#7b596b]">{feature.description}</p>
                  </div>

                  <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vt-surface-soft text-vt-primary-rich sm:flex">
                    <Check aria-hidden="true" size={19} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Machine à tickets */}
        <div className="relative mx-auto flex w-full max-w-[600px] flex-col items-center pt-6">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[12%] h-[420px] w-[420px] max-w-full -translate-x-1/2 rounded-full bg-pink-200/55 blur-3xl"
          />

          <div className="relative z-10 flex w-full flex-col items-center">
            {/* Ticket animé */}
            <div
              className={[
                "relative z-0 w-[min(78%,330px)] rounded-t-xl border border-vt-line-neutral bg-white px-5 pb-16 pt-7 shadow-[0_8px_35px_rgba(70,20,40,0.12)] transition-transform duration-[1600ms] ease-out motion-reduce:transition-none",
                visible ? "translate-y-0" : "translate-y-[150px]",
              ].join(" ")}
            >
              <div className="morocco-receipt-head text-center">
                <h3 className="font-serif text-2xl font-bold text-vt-primary-rich">
                  Institut Royal
                </h3>
                <p className="mt-1 text-[11px] font-semibold text-[#6b4254]">Ticket de caisse</p>
              </div>

              <div className="my-5 border-t border-dashed border-pink-200" />

              <div className="space-y-2 text-[11px] text-[#65485a]">
                <div className="flex justify-between">
                  <span>Ticket</span>
                  <strong>#318</strong>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>10/11/2026</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente</span>
                  <strong>Aicha Chahbi</strong>
                </div>
              </div>

              <div className="my-4 border-t border-dashed border-pink-200" />

              <div className="space-y-3">
                {services.map(([name, price]) => (
                  <div key={name} className="flex justify-between gap-3 text-[11px] text-[#442236]">
                    <span>{name}</span>
                    <span className="shrink-0 font-semibold">{price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-lg bg-vt-surface-soft px-3 py-3 font-bold text-vt-primary-rich">
                <span>TOTAL</span>
                <span>470,00 MAD</span>
              </div>

              <p className="mt-4 text-center text-[11px] text-[#8c6073]">
                Merci pour votre visite ♡
              </p>
            </div>

            {/* Boîtier de l'imprimante */}
            <div className="relative z-20 -mt-12 w-[min(92%,410px)] rounded-[30px] border border-[#e7bccc] bg-gradient-to-br from-white via-vt-surface to-vt-line-neutral p-5 shadow-[0_24px_50px_rgba(95,20,57,0.22)]">
              <div className="flex items-center justify-between">
                <span className="font-serif text-xl font-bold italic text-vt-primary-rich">
                  Rappel Beauty
                </span>
                <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
              </div>

              <div className="mt-4 h-3 rounded-full border border-[#59414e] bg-[#28121e] shadow-inner" />

              <div className="flex items-center justify-between py-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#b00050] to-[#f17ca8] font-serif text-3xl font-bold text-white">
                    R
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7a5265]">
                      Beauty Receipt
                    </p>
                    <p className="mt-1 text-[10px] text-[#a17c8d]">Ticket généré avec succès</p>
                  </div>
                </div>

                <div className="rounded-full border border-pink-200 bg-white p-3 text-vt-primary-rich">
                  <ReceiptText aria-hidden="true" size={20} />
                </div>
              </div>
            </div>

            {/* Socle */}
            <div
              aria-hidden="true"
              className="relative z-10 -mt-2 h-7 w-[95%] rounded-[50%] border border-pink-100 bg-gradient-to-b from-white to-[#f2d9e3] shadow-[0_15px_30px_rgba(100,30,65,0.13)]"
            />

            {/* Informations */}
            <div className="relative z-10 mt-8 flex max-w-full items-center gap-3 rounded-2xl border border-pink-200 bg-white/90 px-5 py-4 text-sm text-[#60384c] shadow-sm">
              <span className="rounded-full bg-vt-surface-soft p-2 text-vt-primary-rich">
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
