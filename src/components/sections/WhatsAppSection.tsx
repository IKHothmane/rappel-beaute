"use client";

import { useState } from "react";
import "./whatsapp-section.css";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardCheck,
  Heart,
  MessageCircle,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const steps = [
  {
    title: "Le rappel est préparé",
    status: "PRÊT",
    description: "Le prénom, le soin, l'heure et la praticienne sont déjà renseignés.",
    icon: ClipboardCheck,
  },
  {
    title: "Vous l'ouvrez dans WhatsApp",
    status: "OUVERT",
    description: "La conversation s'ouvre avec le message prérempli. Vous vérifiez et envoyez.",
    icon: MessageCircle,
  },
  {
    title: "Vous le marquez envoyé",
    status: "ENVOYÉ",
    description: "La file des rappels est mise à jour et votre équipe sait qui a été prévenu.",
    icon: Send,
  },
];

export default function WhatsAppSection() {
  const [activeStep, setActiveStep] = useState(2);

  return (
    <section
      id="whatsapp"
      aria-labelledby="whatsapp-heading"
      className="whatsapp-section relative isolate overflow-hidden bg-vt-surface py-[var(--vt-space-3p5rem)] lg:py-[var(--vt-space-4rem)]"
    >
      <span id="rappels-whatsapp" className="whatsapp-legacy-anchor" aria-hidden="true" />
      {/* Background */}

      <div className="whatsapp-layout mx-auto grid max-w-[var(--vt-size-1200px)] items-center gap-[var(--vt-space-2rem)] px-[var(--vt-space-1p5rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-[var(--vt-space-2p5rem)] lg:px-[var(--vt-space-2rem)] xl:grid-cols-[0.9fr_1.1fr]">
        {/* LEFT */}
        <div>
          <div className="mb-[var(--vt-space-1p75rem)] inline-flex items-center gap-[var(--vt-space-0p75rem)] rounded-full border border-pink-200 bg-white/80 px-[var(--vt-space-1p25rem)] py-[var(--vt-space-0p625rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-bold uppercase tracking-wider text-vt-primary-rich shadow-sm">
            <MessageCircle aria-hidden="true" size={20} />
            Rappels WhatsApp
          </div>

          <h2
            id="whatsapp-heading"
            className="max-w-[var(--vt-size-680px)] font-serif font-semibold leading-[1.1] tracking-tight text-vt-ink-plum"
          >
            Moins de rendez-vous manqués,{" "}
            <span className="relative inline-block italic text-vt-primary-rich">
              sans robot
              <span className="absolute -bottom-2 left-[var(--vt-size-0rem)] h-[var(--vt-size-3px)] w-full rounded-full bg-vt-primary-rich" />
            </span>
          </h2>

          <p className="mt-[var(--vt-space-2rem)] max-w-[var(--vt-size-36rem)] text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)] leading-8 text-[#755767] md:text-[length:var(--vt-text-1p125rem)]/[var(--vt-line-1p75rem)]">
            Rappel Beauty prépare chaque rappel. Vous l’envoyez depuis le WhatsApp de votre institut
            en un clic. Vos clientes reçoivent un message de votre numéro, jamais d’un inconnu.
          </p>

          <div className="mt-[var(--vt-space-2p5rem)] space-y-[var(--vt-space-1rem)]">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const active = activeStep === index;

              return (
                <button
                  key={step.title}
                  type="button"
                  aria-pressed={active}
                  aria-controls="whatsapp-conversation"
                  onClick={() => setActiveStep(index)}
                  className={`group flex w-full items-center gap-[var(--vt-size-0p5rem)] rounded-[14px] border p-3 text-left ${
                    active
                      ? "border-vt-primary-bright bg-white shadow-[0_15px_40px_rgba(190,0,78,0.12)]"
                      : "border-[#f0dce4] bg-white/85 hover:-translate-y-1 hover:border-pink-300 hover:shadow-lg"
                  }`}
                >
                  <div className="whatsapp-step-icon flex h-[2rem] w-[2rem] shrink-0 items-center justify-center rounded-[0.55rem] bg-vt-surface-soft text-vt-primary-rich">
                    <Icon aria-hidden="true" size={15} />
                  </div>

                  <div className="min-w-[var(--vt-size-0rem)] flex-1">
                    <div className="flex flex-wrap items-center gap-[var(--vt-size-0p5rem)]">
                      <span
                        className={`flex h-[var(--vt-size-1p75rem)] w-[var(--vt-size-1p75rem)] items-center justify-center rounded-full text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-bold ${
                          active
                            ? "bg-vt-primary-rich text-white"
                            : "bg-vt-surface-pink text-vt-primary-rich"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <span className="whatsapp-step-title text-[0.95rem] font-semibold leading-tight text-vt-ink-plum">
                        {step.title}
                      </span>

                      <span className="rounded-md bg-vt-surface-soft px-[var(--vt-size-0p5rem)] py-[var(--vt-size-0p25rem)] text-[length:var(--vt-text-10px)] font-bold tracking-wider text-vt-primary-rich">
                        {step.status}
                      </span>
                    </div>

                    <p className="mt-1 text-[0.8125rem] leading-snug text-vt-muted-soft">
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="whatsapp-note mt-[var(--vt-space-1p5rem)] flex items-center gap-[var(--vt-size-0p5rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-vt-muted-soft">
            <Check aria-hidden="true" size={17} className="text-emerald-600" />
            Aucun envoi automatique sans votre validation.
          </p>
        </div>

        {/* RIGHT */}
        <div className="whatsapp-preview relative">
          <div className="whatsapp-glow absolute h-[var(--vt-size-500px)] w-[var(--vt-size-500px)] max-w-full rounded-full bg-pink-200/40 blur-3xl" />

          {/* PHONE */}
          <div className="whatsapp-phone relative z-10 w-[min(100%,365px)] rotate-[-2deg] rounded-[var(--vt-size-48px)] border-[7px] border-vt-ink-dark bg-vt-ink-dark p-[var(--vt-size-5px)] shadow-[0_35px_75px_rgba(75,20,50,0.25)] transition-transform duration-500 hover:rotate-0">
            <div
              id="whatsapp-conversation"
              role="group"
              aria-label="Exemple de conversation WhatsApp"
              className="whatsapp-phone-screen relative overflow-hidden rounded-[var(--vt-size-36px)] bg-[#efe7df]"
            >
              <div className="absolute left-1/2 top-[var(--vt-size-0p5rem)] z-20 h-[var(--vt-size-1p5rem)] w-[var(--vt-size-7rem)] -translate-x-1/2 rounded-full bg-[#211820]" />

              {/* WhatsApp header */}
              <div className="bg-vt-whatsapp-dark px-[var(--vt-space-1p25rem)] pb-[var(--vt-space-1p25rem)] pt-[var(--vt-space-3rem)] text-white">
                <div className="flex items-center gap-[var(--vt-space-0p75rem)]">
                  <div className="flex h-[var(--vt-size-2p75rem)] w-[var(--vt-size-2p75rem)] items-center justify-center rounded-full bg-pink-200 font-bold text-[#9f174e]">
                    AC
                  </div>
                  <div>
                    <div className="font-semibold">Amal Chakir</div>
                    <div className="text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-white/75">en ligne</div>
                  </div>
                  <MessageCircle aria-hidden="true" className="ml-auto" size={20} />
                </div>
              </div>

              {/* Chat */}
              <div className="space-y-[var(--vt-space-1rem)] px-[var(--vt-space-1rem)] py-[var(--vt-space-1p25rem)]">
                <div className="mx-auto w-fit rounded-lg bg-[#dbeaf0] px-[var(--vt-space-1rem)] py-[var(--vt-size-0p375rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-[#43606b]">
                  Lundi
                </div>

                <div
                  className="ml-auto max-w-[95%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-[var(--vt-space-1rem)] shadow-sm"
                >
                  <p className="text-[length:var(--vt-text-15px)] leading-6 text-[#17302a]">
                    Bonjour Amal, petit rappel : votre{" "}
                    <strong>massage relaxant à l’huile d’argan</strong> est prévu demain mardi à{" "}
                    <strong>10:00</strong> avec Nadia, à l’Institut Royal.
                    <br />À demain ! 🌸
                  </p>

                  <div className="mt-[var(--vt-size-0p5rem)] flex items-center justify-end gap-[var(--vt-size-0p25rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-[#3f5c4e]">
                    18:02
                    {activeStep === 0 ? (
                      <Check aria-hidden="true" size={15} />
                    ) : (
                      <CheckCheck aria-hidden="true" size={17} className="text-[#39a8df]" />
                    )}
                  </div>
                </div>

                {activeStep === 2 && (
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white p-[var(--vt-space-1rem)] shadow-sm">
                    <p className="text-[length:var(--vt-text-15px)] text-[#17302a]">Merci, je serai là. 😊</p>
                    <div className="mt-[var(--vt-size-0p5rem)] text-right text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-[#595959]">18:09</div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex items-center gap-[var(--vt-size-0p5rem)] px-[var(--vt-space-0p75rem)] pb-[var(--vt-space-1rem)]">
                <div className="flex flex-1 items-center rounded-full bg-white px-[var(--vt-space-1rem)] py-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-[#595959] shadow-sm">
                  Message...
                </div>
                <div className="flex h-[var(--vt-size-2p75rem)] w-[var(--vt-size-2p75rem)] items-center justify-center rounded-full bg-[#00866b] text-white">
                  <Send aria-hidden="true" size={19} />
                </div>
              </div>
            </div>
          </div>

          <ul className="whatsapp-badges">
            <li>
              <CalendarDays aria-hidden="true" className="text-vt-primary-rich" size={23} />
              Moins d’absences
            </li>
            <li>
              <Heart aria-hidden="true" className="text-vt-primary-rich" size={23} />
              Clientes informées
            </li>
            <li>
              <TrendingUp aria-hidden="true" className="text-vt-primary-rich" size={23} />
              Planning mieux suivi
            </li>
          </ul>

          <p className="whatsapp-caption">
            <Sparkles aria-hidden="true" size={15} className="text-vt-primary-rich" />
            Simple, humain et sans robot
          </p>
        </div>
      </div>
    </section>
  );
}
