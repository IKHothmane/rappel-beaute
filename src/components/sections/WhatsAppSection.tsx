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
      className="whatsapp-section relative isolate overflow-hidden bg-vt-surface py-14 lg:py-16"
    >
      <span id="rappels-whatsapp" className="whatsapp-legacy-anchor" aria-hidden="true" />
      {/* Background */}

      <div className="whatsapp-layout mx-auto grid max-w-[1200px] items-center gap-8 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8">
        {/* LEFT */}
        <div>
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-pink-200 bg-white/80 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-vt-primary-rich shadow-sm">
            <MessageCircle aria-hidden="true" size={20} />
            Rappels WhatsApp
          </div>

          <h2
            id="whatsapp-heading"
            className="max-w-[680px] font-serif font-semibold leading-[1.1] tracking-tight text-vt-ink-plum"
          >
            Moins de rendez-vous manqués,{" "}
            <span className="relative inline-block italic text-vt-primary-rich">
              sans robot
              <span className="absolute -bottom-2 left-0 h-[3px] w-full rounded-full bg-vt-primary-rich" />
            </span>
          </h2>

          <p className="mt-8 max-w-xl text-base leading-8 text-[#755767] md:text-lg">
            Rappel Beauty prépare chaque rappel. Vous l’envoyez depuis le WhatsApp de votre institut
            en un clic. Vos clientes reçoivent un message de votre numéro, jamais d’un inconnu.
          </p>

          <div className="mt-10 space-y-4">
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
                  className={`group flex w-full gap-4 rounded-[22px] border p-5 text-left transition-all duration-300 md:p-6 ${
                    active
                      ? "border-vt-primary-bright bg-white shadow-[0_15px_40px_rgba(190,0,78,0.12)]"
                      : "border-[#f0dce4] bg-white/85 hover:-translate-y-1 hover:border-pink-300 hover:shadow-lg"
                  }`}
                >
                  <div className="whatsapp-step-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-vt-surface-soft text-vt-primary-rich">
                    <Icon aria-hidden="true" size={25} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                          active
                            ? "bg-vt-primary-rich text-white"
                            : "bg-vt-surface-pink text-vt-primary-rich"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <span className="whatsapp-step-title font-semibold text-vt-ink-plum md:text-lg">
                        {step.title}
                      </span>

                      <span className="rounded-md bg-vt-surface-soft px-2 py-1 text-[10px] font-bold tracking-wider text-vt-primary-rich">
                        {step.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-vt-muted-soft md:text-base">
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="whatsapp-note mt-6 flex items-center gap-2 text-sm text-vt-muted-soft">
            <Check aria-hidden="true" size={17} className="text-emerald-600" />
            Aucun envoi automatique sans votre validation.
          </p>
        </div>

        {/* RIGHT */}
        <div className="whatsapp-preview relative flex items-center justify-center">
          <div className="absolute h-[500px] w-[500px] max-w-full rounded-full bg-pink-200/40 blur-3xl" />

          {/* PHONE */}
          <div className="whatsapp-phone relative z-10 w-[min(100%,365px)] rotate-[-2deg] rounded-[48px] border-[7px] border-vt-ink-dark bg-vt-ink-dark p-[5px] shadow-[0_35px_75px_rgba(75,20,50,0.25)] transition-transform duration-500 hover:rotate-0">
            <div
              id="whatsapp-conversation"
              role="group"
              aria-label="Exemple de conversation WhatsApp"
              className="whatsapp-phone-screen relative overflow-hidden rounded-[36px] bg-[#efe7df]"
            >
              <div className="absolute left-1/2 top-2 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-[#211820]" />

              {/* WhatsApp header */}
              <div className="bg-vt-whatsapp-dark px-5 pb-5 pt-12 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-200 font-bold text-[#9f174e]">
                    AC
                  </div>
                  <div>
                    <div className="font-semibold">Amal Chakir</div>
                    <div className="text-xs text-white/75">en ligne</div>
                  </div>
                  <MessageCircle aria-hidden="true" className="ml-auto" size={20} />
                </div>
              </div>

              {/* Chat */}
              <div className="space-y-5 px-4 py-7">
                <div className="mx-auto w-fit rounded-lg bg-[#dbeaf0] px-4 py-1.5 text-xs text-[#43606b]">
                  Lundi
                </div>

                <div
                  className={`ml-auto max-w-[95%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-4 shadow-sm transition-all duration-500 ${
                    activeStep === 0 ? "opacity-70" : "opacity-100"
                  }`}
                >
                  <p className="text-[15px] leading-6 text-[#17302a]">
                    Bonjour Amal, petit rappel : votre{" "}
                    <strong>massage relaxant à l’huile d’argan</strong> est prévu demain mardi à{" "}
                    <strong>10:00</strong> avec Nadia, à l’Institut Royal.
                    <br />À demain ! 🌸
                  </p>

                  <div className="mt-2 flex items-center justify-end gap-1 text-xs text-[#6c8276]">
                    18:02
                    {activeStep === 0 ? (
                      <Check aria-hidden="true" size={15} />
                    ) : (
                      <CheckCheck aria-hidden="true" size={17} className="text-[#39a8df]" />
                    )}
                  </div>
                </div>

                {activeStep === 2 && (
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white p-4 shadow-sm">
                    <p className="text-[15px] text-[#17302a]">Merci, je serai là. 😊</p>
                    <div className="mt-2 text-right text-xs text-gray-400">18:09</div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="absolute bottom-5 left-3 right-3 flex items-center gap-2">
                <div className="flex flex-1 items-center rounded-full bg-white px-4 py-3 text-sm text-gray-400 shadow-sm">
                  Message...
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00866b] text-white">
                  <Send aria-hidden="true" size={19} />
                </div>
              </div>
            </div>
          </div>

          {/* FLOATING CARDS */}
          <div className="absolute right-0 top-[14%] z-20 hidden rounded-2xl border border-pink-100 bg-white/95 px-4 py-3 shadow-xl xl:flex xl:items-center xl:gap-3">
            <CalendarDays aria-hidden="true" className="text-vt-primary-rich" size={23} />
            <span className="text-sm font-semibold text-vt-ink-plum">Moins d’absences</span>
          </div>

          <div className="absolute -right-3 top-[43%] z-20 hidden rounded-2xl border border-pink-100 bg-white/95 px-4 py-3 shadow-xl xl:flex xl:items-center xl:gap-3">
            <Heart aria-hidden="true" className="text-vt-primary-rich" size={23} />
            <span className="text-sm font-semibold text-vt-ink-plum">Clientes informées</span>
          </div>

          <div className="absolute bottom-[18%] right-0 z-20 hidden rounded-2xl border border-pink-100 bg-white/95 px-4 py-3 shadow-xl xl:flex xl:items-center xl:gap-3">
            <TrendingUp aria-hidden="true" className="text-vt-primary-rich" size={23} />
            <span className="text-sm font-semibold text-vt-ink-plum">Planning mieux suivi</span>
          </div>

          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-pink-100 bg-white/90 px-5 py-3 text-xs font-medium text-[#7d5366] shadow-sm">
            <Sparkles aria-hidden="true" size={15} className="text-vt-primary-rich" />
            Simple, humain et sans robot
          </div>
        </div>
      </div>
    </section>
  );
}
