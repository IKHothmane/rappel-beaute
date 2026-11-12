"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  MotionConfig,
  animate,
  motion,
  motionValue,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReceiptItem = { name: string; qty: number; price: number };

export type ReceiptPrinterProps = {
  store?: string;
  address?: string;
  items?: ReceiptItem[];
  currency?: string;
  /** prefix: ¥100 — suffix: 100 MAD */
  currencyPosition?: "prefix" | "suffix";
  /** 0.1 = 10%. 0 hides the tax lines. */
  taxRate?: number;
  onPrint?: (order: number) => void;
  className?: string;
  /** Fits the parent instead of the viewport. */
  embedded?: boolean;
  /** Prints one receipt when the printer appears. */
  autoPrint?: boolean;
  thanks?: string;
  startOrder?: number;
  dateLocale?: string;
  mark?: string;
  labels?: { idle: string; printing: string; ready: string };
};

const ITEMS: ReceiptItem[] = [
  { name: "Cola", qty: 2, price: 100 },
  { name: "Melon soda", qty: 1, price: 90 },
  { name: "Peach", qty: 1, price: 120 },
  { name: "Rice crackers", qty: 1, price: 180 },
];

/** One design unit. The stage is 440 x 930 units. */
const u = (n: number) => `calc(var(--u) * ${n})`;
const W = 440;
const H = 930;
const SLOT_Y = 690;
const PAPER_W = 300;
const PAPER_X = (W - PAPER_W) / 2;

type Receipt = {
  id: number;
  order: number;
  date: string;
  frac: MotionValue<number>;
};
type Phase = "idle" | "printing" | "stopped";

const DEFAULT_LABELS = {
  idle: "Press print",
  printing: "Printing… press print to stop",
  ready: "Pull to tear it off, or print another",
};

export function ReceiptPrinter({
  store = "Fizz & Co.",
  address = "12 Harbor Street, Lisbon",
  items = ITEMS,
  currency = "¥",
  currencyPosition = "prefix",
  taxRate = 0.1,
  onPrint,
  className,
  embedded = false,
  autoPrint = false,
  thanks = "THANK YOU",
  startOrder = 426,
  dateLocale = "en-GB",
  mark = "skyrmo",
  labels,
}: ReceiptPrinterProps) {
  const [strip, setStrip] = useState([] as Receipt[]);
  const [flying, setFlying] = useState(
    null as null | {
      strip: Receipt[];
      x: number;
      y: number;
      vx: number;
      vy: number;
    },
  );
  const [phase, setPhase] = useState("idle" as Phase);
  const [pressed, setPressed] = useState(false);
  const [soundOff, setSoundOff] = useState(false);
  const [unit, setUnit] = useState(0.55);
  const order = useRef(startOrder);
  const nextId = useRef(0);
  const feeding = useRef(null as null | { stop: () => void });
  const frameRef = useRef<HTMLDivElement>(null);

  const pullX = useMotionValue(0);
  const pullY = useMotionValue(0);
  const pullR = useTransform(pullX, (x) => x * 0.04);
  const drag = useRef(
    null as null | {
      x0: number;
      y0: number;
      lx: number;
      ly: number;
      lt: number;
      vx: number;
      vy: number;
    },
  );

  const lines = 16 + items.length;

  useEffect(() => () => feeding.current?.stop(), []);

  useLayoutEffect(() => {
    if (!embedded) return;
    const el = frameRef.current;
    if (!el) return;
    const fit = () => {
      const next = Math.min(el.clientWidth / W, el.clientHeight / H);
      if (next > 0) setUnit(next);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [embedded]);

  const printOne = () => {
    order.current += 1;
    const receipt: Receipt = {
      id: nextId.current++,
      order: order.current,
      date: new Date().toLocaleString(dateLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      frac: motionValue(0),
    };
    setStrip((current) => [...current, receipt]);
    setPhase("printing");
    onPrint?.(order.current);

    const dur = 0.9 + lines * 0.1;
    const stopSound = sfx.feed(dur);
    const run = animate(receipt.frac, 1, { duration: dur, ease: [0.4, 0, 0.9, 1] });
    feeding.current = {
      stop: () => {
        run.stop();
        stopSound();
      },
    };
    run.then(() => {
      if (receipt.frac.get() < 0.999) return;
      feeding.current = null;
      setPhase("stopped");
      sfx.done();
    });
  };

  const printRef = useRef(printOne);
  printRef.current = printOne;

  useEffect(() => {
    if (!autoPrint) return;
    const id = window.setTimeout(() => printRef.current(), 450);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  const stopFeed = () => {
    feeding.current?.stop();
    feeding.current = null;
    setPhase("stopped");
  };

  const tear = (vx: number, vy: number) => {
    if (!strip.length) return;
    feeding.current?.stop();
    feeding.current = null;
    sfx.rip();
    setFlying({ strip, x: pullX.get(), y: pullY.get(), vx, vy });
    setStrip([]);
    setPhase("idle");
    pullX.set(0);
    pullY.set(0);
  };

  const print = () => {
    sfx.unlock();
    sfx.button();
    setPressed(true);
    setTimeout(() => setPressed(false), 140);
    if (phase === "printing") stopFeed();
    else setTimeout(printOne, 160);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    sfx.unlock();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x0: e.clientX,
      y0: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      lt: e.timeStamp,
      vx: 0,
      vy: 0,
    };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.max(1, e.timeStamp - d.lt);
    d.vx = ((e.clientX - d.lx) / dt) * 1000;
    d.vy = ((e.clientY - d.ly) / dt) * 1000;
    d.lx = e.clientX;
    d.ly = e.clientY;
    d.lt = e.timeStamp;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    pullX.set(dx * 0.3);
    pullY.set(Math.min(0, dy) * 0.3);
    if (Math.hypot(dx, Math.min(0, dy)) > 80) {
      drag.current = null;
      tear(d.vx || dx * 8, Math.min(d.vy, -300));
    }
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    animate(pullX, 0, { type: "spring", stiffness: 500, damping: 22 });
    animate(pullY, 0, { type: "spring", stiffness: 500, damping: 22 });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tear(0, -900);
    }
  };

  const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = Math.round(total * taxRate);
  const paper = { store, address, items, currency, currencyPosition, total, tax, taxRate, thanks };
  const copy = { ...DEFAULT_LABELS, ...labels };
  const hint = phase === "printing" ? copy.printing : strip.length ? copy.ready : copy.idle;

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={frameRef}
        className={cn(
          "relative grid w-full place-items-center overflow-hidden font-sans text-[#2b2a27]",
          embedded ? "h-full min-h-0" : "min-h-dvh",
          className,
        )}
        style={
          {
            "--u": embedded
              ? `${unit}px`
              : "min((100vw - 32px) / 440, (100dvh - 24px) / 930)",
            background: embedded
              ? "transparent"
              : "radial-gradient(80% 70% at 50% 35%, #e9e6df 0%, #dcd8cf 55%, #cdc8bd 100%)",
          } as CSSProperties
        }
      >
        {embedded ? null : (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
        )}

        <button
          type="button"
          onClick={() => {
            const next = !soundOff;
            setSoundOff(next);
            setMuted(next);
            if (!next) {
              sfx.unlock();
              sfx.button();
            }
          }}
          aria-label={soundOff ? "Activer le son" : "Couper le son"}
          aria-pressed={soundOff}
          className={cn(
            "absolute z-40 grid size-10 cursor-pointer place-items-center rounded-full bg-white/70 text-[#2b2a27] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_6px_16px_-8px_rgb(0_0_0/0.3)] ring-1 ring-black/5 backdrop-blur transition-[transform,background-color] duration-200 hover:bg-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4231a]",
            embedded ? "right-2 top-2" : "bottom-4 right-4",
          )}
        >
          {soundOff ? (
            <VolumeX className="size-[18px]" strokeWidth={2} />
          ) : (
            <Volume2 className="size-[18px]" strokeWidth={2} />
          )}
        </button>

        <div className="relative" style={{ width: u(W), height: u(H) }}>
          <div
            className="pointer-events-none absolute z-10 overflow-hidden"
            style={{
              left: u(PAPER_X - 40),
              width: u(PAPER_W + 80),
              top: u(-3000),
              height: u(SLOT_Y + 3000),
            }}
          >
            {strip.length > 0 && (
              <motion.div
                role="button"
                tabIndex={0}
                aria-label="Ticket. Tirez-le, ou appuyez sur Entrée, pour le détacher."
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onKeyDown={onKey}
                className="pointer-events-auto absolute bottom-0 cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#d4231a]/60 active:cursor-grabbing"
                style={{
                  left: u(40),
                  width: u(PAPER_W),
                  x: pullX,
                  y: pullY,
                  rotate: pullR,
                  transformOrigin: "50% 100%",
                }}
              >
                <Strip strip={strip} paper={paper} />
              </motion.div>
            )}
          </div>

          {flying && (
            <motion.div
              className="pointer-events-none absolute z-30"
              style={{
                left: u(PAPER_X),
                width: u(PAPER_W),
                bottom: u(H - SLOT_Y),
                transformOrigin: "50% 100%",
                WebkitMask: ZIGZAG_BOTTOM,
                mask: ZIGZAG_BOTTOM,
              }}
              initial={{ x: flying.x, y: flying.y, rotate: flying.x * 0.04, opacity: 1 }}
              animate={{
                x: flying.x + flying.vx * 0.55,
                y: flying.y + flying.vy * 0.55 - 120,
                rotate: flying.x * 0.04 + flying.vx * 0.03 + (flying.vx >= 0 ? 14 : -14),
                opacity: 0,
              }}
              transition={{
                duration: 0.85,
                ease: [0.2, 0.7, 0.3, 1],
                opacity: { duration: 0.85, ease: "easeIn" },
              }}
              onAnimationComplete={() => setFlying(null)}
            >
              <Strip strip={flying.strip} paper={paper} />
            </motion.div>
          )}

          <div className="absolute" style={{ left: u(20), top: u(640), width: u(400), height: u(240) }}>
            <div
              className="absolute inset-0"
              style={{
                borderRadius: u(40),
                background: "linear-gradient(180deg, #f6f4ef 0%, #ebe8e1 55%, #dedad1 100%)",
                boxShadow: `inset 0 ${u(2)} ${u(1)} rgb(255 255 255 / 0.9), inset 0 ${u(-6)} ${u(10)} rgb(120 110 95 / 0.18), 0 ${u(2)} ${u(3)} rgb(60 50 40 / 0.18), ${u(10)} ${u(26)} ${u(40)} ${u(-8)} rgb(60 50 40 / 0.4)`,
              }}
            />
            <div
              className="absolute"
              style={{
                left: u(24),
                right: u(24),
                top: u(92),
                height: u(2),
                borderRadius: u(2),
                background: "rgb(120 110 95 / 0.25)",
                boxShadow: `0 ${u(1)} 0 rgb(255 255 255 / 0.8)`,
              }}
            />
            <div
              className="absolute"
              style={{
                left: u(PAPER_X - 20 - 18),
                width: u(PAPER_W + 36),
                top: u(SLOT_Y - 640 - 7),
                height: u(14),
                borderRadius: u(7),
                background: "linear-gradient(180deg, #1b1a18, #3a3833)",
                boxShadow: `inset 0 ${u(2)} ${u(3)} rgb(0 0 0 / 0.8), 0 ${u(1)} 0 rgb(255 255 255 / 0.85)`,
              }}
            />
            {!strip.length && (
              <div
                className="absolute bg-[#fbfaf6]"
                style={{
                  left: u(PAPER_X - 20),
                  width: u(PAPER_W),
                  top: u(SLOT_Y - 640 - 9),
                  height: u(9),
                  WebkitMask: ZIGZAG_TOP,
                  mask: ZIGZAG_TOP,
                }}
              />
            )}
            <div className="absolute flex items-center" style={{ left: u(250), top: u(132), gap: u(8) }}>
              <motion.span
                className="block rounded-full"
                style={{ width: u(9), height: u(9) }}
                animate={
                  phase === "printing"
                    ? {
                        backgroundColor: ["#ffb340", "#7a5310", "#ffb340"],
                        boxShadow: [`0 0 ${u(8)} #ffb340`, "0 0 0px #ffb340", `0 0 ${u(8)} #ffb340`],
                      }
                    : {
                        backgroundColor: "#4fd27a",
                        boxShadow: `0 0 ${u(7)} rgb(79 210 122 / 0.8)`,
                      }
                }
                transition={
                  phase === "printing" ? { duration: 0.5, repeat: Infinity } : { duration: 0.3 }
                }
              />
            </div>

            <button
              type="button"
              onClick={print}
              aria-label="Imprimer le ticket"
              className="absolute grid cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4231a]"
              style={{
                left: u(300),
                top: u(104),
                width: u(72),
                height: u(72),
                background: "radial-gradient(circle at 50% 45%, #2f2d29, #1a1917)",
                boxShadow: `inset 0 ${u(2)} ${u(3)} rgb(0 0 0 / 0.6), 0 ${u(1)} 0 rgb(255 255 255 / 0.9)`,
              }}
            >
              <span
                className="grid place-items-center rounded-full font-bold tracking-[0.14em] text-white transition-[transform,box-shadow,filter] duration-100"
                style={{
                  width: u(60),
                  height: u(60),
                  fontSize: u(11),
                  background:
                    "radial-gradient(circle at 38% 30%, #ff8a7a 0%, #f2392c 38%, #c81d13 75%, #9c140d 100%)",
                  boxShadow: pressed
                    ? `inset 0 ${u(3)} ${u(6)} rgb(80 0 0 / 0.55)`
                    : `inset 0 ${u(-3)} ${u(5)} rgb(80 0 0 / 0.45), inset 0 ${u(2)} ${u(2)} rgb(255 200 190 / 0.7), 0 ${u(4)} ${u(6)} rgb(0 0 0 / 0.45)`,
                  transform: pressed ? `translateY(${u(2)}) scale(0.96)` : "none",
                  filter: pressed ? "brightness(0.92)" : "none",
                  textShadow: `0 ${u(1)} ${u(1)} rgb(100 0 0 / 0.6)`,
                }}
              >
                PRINT
              </span>
            </button>

            <span
              aria-hidden
              className="absolute bg-clip-text font-bold tracking-[-0.02em] text-transparent"
              style={{
                left: u(34),
                top: u(182),
                fontSize: u(18),
                backgroundImage:
                  "linear-gradient(180deg, #6b6b70 0%, #1c1c1f 42%, #000 50%, #0b0b0d 78%, #2a2a2e 100%)",
                filter: `drop-shadow(0 ${u(1)} 0 rgb(255 255 255 / 0.9)) drop-shadow(0 ${u(1)} ${u(1.5)} rgb(0 0 0 / 0.25))`,
              }}
            >
              {mark}
            </span>
          </div>

          <div
            className="absolute z-20"
            style={{
              left: u(PAPER_X - 22),
              width: u(PAPER_W + 44),
              top: u(SLOT_Y - 12),
              height: u(7),
              background: "linear-gradient(180deg, #f4f5f7, #a9adb5 60%, #7c8089)",
              WebkitMask: ZIGZAG_TOP_SMALL,
              mask: ZIGZAG_TOP_SMALL,
              filter: `drop-shadow(0 ${u(1)} ${u(1)} rgb(0 0 0 / 0.35))`,
            }}
          />

          <motion.p
            key={hint}
            aria-live="polite"
            initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            className="absolute inset-x-0 text-center text-[#6f6a60]"
            style={{ top: u(898), fontSize: u(13) }}
          >
            {hint}
          </motion.p>
        </div>
      </div>
    </MotionConfig>
  );
}

const ZIGZAG_TOP =
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 50% / calc(var(--u) * 12) 100%";
const ZIGZAG_TOP_SMALL =
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) 50% / calc(var(--u) * 6) 100%";
const ZIGZAG_BOTTOM =
  "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / calc(var(--u) * 12) 100%";

function Row({ l, r, strong }: { l: string; r: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", strong && "font-bold")} style={{ fontSize: u(strong ? 14 : 11.5) }}>
      <span className="truncate">{l}</span>
      <span className="shrink-0 tabular-nums">{r}</span>
    </div>
  );
}

function Rule() {
  return <div className="border-t border-dashed border-[#2a2a2a]/50" style={{ margin: `${u(9)} 0` }} />;
}

type PaperProps = {
  store: string;
  address: string;
  items: ReceiptItem[];
  currency: string;
  currencyPosition: "prefix" | "suffix";
  total: number;
  tax: number;
  taxRate: number;
  thanks: string;
};

function Strip({ strip, paper }: { strip: Receipt[]; paper: PaperProps }) {
  return (
    <div style={{ boxShadow: `0 ${u(10)} ${u(24)} ${u(-6)} rgb(40 35 25 / 0.35)` }}>
      {strip.map((receipt, index) => (
        <Segment key={receipt.id} receipt={receipt} first={index === 0} paper={paper} />
      ))}
    </div>
  );
}

function Segment({
  receipt,
  first,
  paper,
}: {
  receipt: Receipt;
  first: boolean;
  paper: PaperProps;
}) {
  const inner = useRef(null as HTMLDivElement | null);
  const full = useMotionValue(0);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    full.set(el.offsetHeight);
    const observer = new ResizeObserver(() => full.set(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [full]);
  const height = useTransform(() => receipt.frac.get() * full.get());
  return (
    <motion.div className="relative overflow-hidden" style={{ height }}>
      <div ref={inner}>
        <Paper receipt={receipt} first={first} {...paper} />
      </div>
    </motion.div>
  );
}

function Paper({
  receipt,
  first,
  store,
  address,
  items,
  currency,
  currencyPosition,
  total,
  tax,
  taxRate,
  thanks,
}: {
  receipt: Receipt;
  first?: boolean;
} & PaperProps) {
  const money = (amount: number) => {
    const formatted =
      currencyPosition === "suffix"
        ? amount.toLocaleString("fr-FR")
        : amount.toLocaleString("en-US");
    return currencyPosition === "suffix" ? `${formatted} ${currency}` : `${currency}${formatted}`;
  };
  const bars = Array.from({ length: 46 }, (_, i) => ((receipt.order * (i + 7) * 31 + i * i) % 3) + 1);

  return (
    <div
      className="relative font-mono text-[#262624]"
      style={{
        padding: `${u(22)} ${u(22)} ${u(30)}`,
        lineHeight: 1.55,
        background: "linear-gradient(90deg, #f1f0eb 0%, #fdfdfa 6%, #fdfdfa 94%, #eeede8 100%)",
      }}
    >
      <div style={{ opacity: 0.88, filter: "blur(0.15px)" }}>
        <div className="text-center">
          <div className="font-bold uppercase tracking-[0.08em]" style={{ fontSize: u(17) }}>
            {store}
          </div>
          <div style={{ fontSize: u(10.5) }}>{address}</div>
        </div>
        <Rule />
        <Row l={`Ticket #${String(receipt.order).padStart(4, "0")}`} r="" />
        <Row l={receipt.date} r="" />
        <Rule />
        {items.map((item) => (
          <Row key={item.name} l={`${item.qty} x ${item.name}`} r={money(item.qty * item.price)} />
        ))}
        <Rule />
        {taxRate > 0 ? (
          <>
            <Row l="Sous-total" r={money(total)} />
            <Row l={`Taxe ${Math.round(taxRate * 100)} %`} r={money(tax)} />
            <div style={{ height: u(6) }} />
          </>
        ) : null}
        <Row l="Total" r={money(total + tax)} strong />
        <Rule />
        <div className="flex items-stretch justify-center" style={{ height: u(46), gap: u(1.5), marginTop: u(6) }}>
          {bars.map((width, index) => (
            <span
              key={index}
              className="bg-[#262624]"
              style={{ width: u(width * 1.4), opacity: index % 5 === 0 ? 0.85 : 1 }}
            />
          ))}
        </div>
        <div className="text-center tracking-[0.3em]" style={{ fontSize: u(9.5), marginTop: u(4) }}>
          {String(receipt.order).padStart(4, "0")} {receipt.date.match(/\d{4}/)?.[0] ?? ""}
        </div>
        <div className="text-center font-bold tracking-[0.2em]" style={{ fontSize: u(12), marginTop: u(14) }}>
          {thanks}
        </div>
      </div>
      {first ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: u(26), background: "linear-gradient(180deg, rgb(0 0 0 / 0.07), transparent)" }}
        />
      ) : null}
    </div>
  );
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .45 0 0 0 0 .4 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

let audio: AudioContext | null = null;
const ac = () => (audio ??= new AudioContext());
let master: GainNode | null = null;
let muted = false;
const globalOut = () => {
  const context = ac();
  if (!master) {
    master = context.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(context.destination);
  }
  return master;
};
const setMuted = (value: boolean) => {
  muted = value;
  if (master) master.gain.value = value ? 0 : 1;
};

function tone(
  freq: number,
  dur: number,
  options: { type?: OscillatorType; gain?: number; at?: number; to?: number } = {},
) {
  const context = ac();
  const start = context.currentTime + (options.at ?? 0);
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (options.to) osc.frequency.exponentialRampToValueAtTime(options.to, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.15, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(globalOut());
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(
  dur: number,
  options: { at?: number; gain?: number; freq?: number; type?: BiquadFilterType } = {},
) {
  const context = ac();
  const start = context.currentTime + (options.at ?? 0);
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * dur), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = options.type ?? "lowpass";
  filter.frequency.value = options.freq ?? 800;
  const gain = context.createGain();
  gain.gain.setValueAtTime(options.gain ?? 0.3, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  source.connect(filter).connect(gain).connect(globalOut());
  source.start(start);
}

const sfx = {
  unlock: () => void ac().resume(),
  button: () => {
    noise(0.02, { freq: 1300, type: "bandpass", gain: 0.6 });
    tone(230, 0.05, { gain: 0.08, to: 160 });
  },
  feed: (dur: number) => {
    const context = ac();
    const start = context.currentTime;
    const out = context.createGain();
    out.gain.setValueAtTime(0.0001, start);
    out.gain.exponentialRampToValueAtTime(0.06, start + 0.06);
    out.gain.setValueAtTime(0.06, start + Math.max(0.07, dur - 0.1));
    out.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    out.connect(globalOut());

    const chop = context.createGain();
    chop.gain.value = 0.58;
    const lfo = context.createOscillator();
    lfo.type = "square";
    lfo.frequency.value = 34;
    const depth = context.createGain();
    depth.gain.value = 0.42;
    lfo.connect(depth).connect(chop.gain);
    chop.connect(out);

    const motor = context.createOscillator();
    motor.type = "sawtooth";
    motor.frequency.setValueAtTime(290, start);
    motor.frequency.linearRampToValueAtTime(320, start + dur);
    const body = context.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = 1300;
    body.Q.value = 1.4;
    motor.connect(body).connect(chop);

    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * dur), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const hiss = context.createBufferSource();
    hiss.buffer = buffer;
    const air = context.createBiquadFilter();
    air.type = "bandpass";
    air.frequency.value = 5200;
    air.Q.value = 0.8;
    const hissGain = context.createGain();
    hissGain.gain.value = 0.35;
    hiss.connect(air).connect(hissGain).connect(chop);

    for (const node of [lfo, motor, hiss]) {
      node.start(start);
      node.stop(start + dur + 0.05);
    }
    return () => {
      const now = context.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    };
  },
  done: () => {
    tone(1568, 0.09, { gain: 0.03 });
    tone(2093, 0.14, { at: 0.08, gain: 0.025 });
  },
  rip: () => {
    for (let i = 0; i < 12; i++) {
      noise(0.018 + Math.random() * 0.02, {
        at: i * 0.02 + Math.random() * 0.01,
        freq: 2200 + Math.random() * 3000,
        type: "highpass",
        gain: 0.25 + Math.random() * 0.3,
      });
    }
  },
};
