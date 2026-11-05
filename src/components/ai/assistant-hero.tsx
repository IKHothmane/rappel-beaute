"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

type Props = {
  orgName: string;
};

export function AssistantHero({
  orgName,
}: Props) {
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#54112F] via-[#8E194B] to-[#BE3976] px-6 py-8 text-white shadow-[0_18px_45px_rgba(91,20,55,0.16)] lg:px-10">
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.55, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
        }}
        className="pointer-events-none absolute -right-12 -top-24 h-80 w-80 rounded-full bg-pink-300/30 blur-[80px]"
      />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-8">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold">
            <Sparkles size={15} />
            Assistant IA — {orgName}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            Assistant Rappel Beauté
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-pink-100">
            Votre copilote intelligent pour comprendre
            votre activité, répondre à vos questions
            et vous accompagner dans la gestion
            quotidienne de votre institut.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-pink-100">
            {[
              "Réponses personnalisées",
              "Analyses à la demande",
              "Conseils de gestion",
            ].map((item) => (
              <span
                key={item}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={15} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <motion.div
          animate={{ y: [0, -9, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative hidden lg:flex"
        >
          <div className="flex h-44 w-44 items-center justify-center rounded-[45px] border border-white/30 bg-white/15 shadow-2xl backdrop-blur-md">
            <Bot size={100} strokeWidth={1.2} />
          </div>

          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -right-3 -top-3 rounded-2xl bg-pink-300 p-3 text-[#75143D]"
          >
            <Sparkles size={23} />
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}
