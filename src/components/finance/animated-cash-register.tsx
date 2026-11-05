"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Banknote, Check, CreditCard, LockKeyhole, LockKeyholeOpen, ReceiptText } from "lucide-react";

type Props = {
  /** Controlled state. When omitted the component manages its own state. */
  open?: boolean;
  initialOpen?: boolean;
  onToggle?: (open: boolean) => void;
  /** Scene only (scaled down, no card/button), to embed in another panel. */
  embedded?: boolean;
};

const NOTES = [
  { value: "200", color: "#F5C88D" },
  { value: "100", color: "#9DC9C0" },
  { value: "50", color: "#E9A6A0" },
  { value: "20", color: "#C8A6D8" },
] as const;

/**
 * Purely visual cash-register illustration. It does NOT open or close the real
 * cash session: that stays handled by the secured /api/cash-register routes.
 */
export default function AnimatedCashRegister({ open: controlled, initialOpen = false, onToggle, embedded = false }: Props) {
  const [inner, setInner] = useState(initialOpen);
  const reduced = useReducedMotion();
  const open = controlled ?? inner;

  function toggle() {
    const next = !open;
    setInner(next);
    onToggle?.(next);
  }

  const drawerTransition = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 130, damping: 19 };
  const soft = reduced ? { duration: 0 } : { duration: 0.6 };

  const scene = (
    <div
      className="relative h-[330px] w-[480px] max-w-none origin-top-left"
      role="img"
      aria-label={open ? "Caisse enregistreuse, tiroir ouvert" : "Caisse enregistreuse, tiroir fermé"}
    >
      <motion.div
        animate={{ scale: open ? 1.12 : 1, opacity: open ? 0.9 : 0.6 }}
        transition={soft}
        className="absolute bottom-0 left-10 h-12 w-[400px] rounded-full bg-pink-300/50 blur-2xl"
      />

      {/* Imprimante */}
      <div className="absolute left-0 top-[120px] z-20 h-[110px] w-[125px] rounded-[20px] border border-pink-300 bg-gradient-to-br from-[#F2A3C2] to-[#722045] shadow-2xl">
        <div className="absolute left-3 top-5 h-10 w-24 rounded-lg bg-[#361323]" />
        <motion.div
          animate={{ y: open ? -18 : 0 }}
          transition={soft}
          className="absolute left-8 top-1 flex h-16 w-14 flex-col items-center rounded-b-lg bg-white p-2 text-[#9C2054] shadow-lg"
        >
          <ReceiptText size={17} />
          <div className="mt-2 h-1 w-full bg-pink-200" />
          <div className="mt-1 h-1 w-full bg-pink-200" />
          <div className="mt-1 h-1 w-2/3 bg-pink-200" />
        </motion.div>
      </div>

      {/* Écran */}
      <div className="absolute left-[125px] top-[12px] z-30 h-[165px] w-[240px] rotate-[-4deg] rounded-[22px] border-[9px] border-[#F2A0C2] bg-[#381124] shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-[#B21B59] to-[#671037]">
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key="open"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                  <Check size={30} />
                </div>
                <span className="text-sm font-bold">Caisse ouverte</span>
              </motion.div>
            ) : (
              <motion.div
                key="closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <Banknote size={26} className="text-pink-100" />
                <span className="text-xl font-bold">Rappel Beauty</span>
                <span className="text-[11px] text-pink-200">Institut de beauté</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute left-[225px] top-[165px] z-10 h-16 w-10 bg-[#6C2043]" />

      {/* Terminal */}
      <div className="absolute right-[10px] top-[135px] z-30 h-[115px] w-[75px] rotate-[10deg] rounded-xl border-[5px] border-[#54152F] bg-[#E58BAD] shadow-xl">
        <div className="mx-auto mt-2 flex h-10 w-14 items-center justify-center rounded-md bg-[#5C1938]">
          <CreditCard size={23} />
        </div>
        <div className="mx-auto mt-3 grid w-12 grid-cols-3 gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-2 rounded-sm bg-white/80" />
          ))}
        </div>
      </div>

      {/* Corps */}
      <div className="absolute bottom-[65px] left-[65px] z-20 h-[105px] w-[350px] rounded-[20px] border border-[#F8B2CD] bg-gradient-to-br from-[#F7A1C1] via-[#D7528C] to-[#8B1D4D] shadow-2xl">
        <div className="absolute left-5 right-5 top-4 h-2 rounded-full bg-[#6E1A3E]/50" />
      </div>

      {/* Tiroir */}
      <motion.div
        initial={false}
        animate={{ y: open ? 65 : 0, scale: open ? 1.04 : 1 }}
        transition={drawerTransition}
        className="absolute bottom-[55px] left-[90px] z-30 h-[90px] w-[300px] rounded-b-2xl border border-[#F6A4C6] bg-gradient-to-b from-[#7B2048] to-[#3E1429] shadow-2xl"
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: reduced ? 0 : 0.15 }}
              className="absolute inset-x-3 top-3 flex h-11 gap-2"
            >
              {NOTES.map((note) => (
                <div
                  key={note.value}
                  style={{ backgroundColor: note.color }}
                  className="flex flex-1 items-center justify-center rounded-md border border-white/50 text-sm font-black text-[#50253B] shadow-sm"
                >
                  {note.value}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-0 left-0 right-0 flex h-9 items-center justify-center rounded-b-xl border-t border-pink-200/40 bg-gradient-to-b from-[#BC3A75] to-[#8B2050]">
          <div className="h-2 w-12 rounded-full bg-pink-200/80" />
        </div>
      </motion.div>
    </div>
  );

  if (embedded) {
    // Scene 480×330 ; tiroir ouvert descend (~+65) → hauteur utile ~400 @ scale 0.62.
    const scale = 0.62;
    const width = Math.round(480 * scale);
    const height = Math.round((open ? 400 : 330) * scale);
    return (
      <div className="relative mx-auto max-w-full overflow-visible" style={{ width, height }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
          {scene}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[780px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#420923] via-[#86133F] to-[#BD3570] p-5 text-white sm:p-10">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-pink-500/30 blur-[80px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-pink-400/20 blur-[80px]" />
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ backgroundColor: open ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.14)" }}
          className="mb-6 flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold"
        >
          {open ? <LockKeyholeOpen size={18} /> : <LockKeyhole size={18} />}
          {open ? "Caisse ouverte" : "Caisse fermée"}
        </motion.div>
        <div className="h-[215px] w-[312px] sm:h-[280px] sm:w-[408px] md:h-[330px] md:w-[480px]">
          <div className="origin-top-left scale-[0.65] sm:scale-[0.85] md:scale-100">{scene}</div>
        </div>
        <motion.button
          type="button"
          onClick={toggle}
          aria-pressed={open}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative z-40 mt-4 flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-bold text-[#921A50] shadow-xl transition hover:bg-pink-50"
        >
          {open ? <LockKeyhole size={19} /> : <LockKeyholeOpen size={19} />}
          {open ? "Fermer la caisse" : "Ouvrir la caisse"}
        </motion.button>
      </div>
    </div>
  );
}
