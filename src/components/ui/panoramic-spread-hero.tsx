"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type PanoramicImage = { src: string; alt: string };

type Pose = { x: number; y: number; rotateZ: number; rotateY: number; scale: number };
type Layout = { stacked: Omit<Pose, "scale">; panoramic: Pose; size: { w: string; h: string; ml: string; mt: string } };
type Card = { item: PanoramicImage; z: number; desktop: Layout; mobile: Layout; priority: boolean };

// Arc 3D autour du centre, pour le mobile et le desktop.
function generatePanoramicCards(images: readonly PanoramicImage[]): Card[] {
  const centerIndex = (images.length - 1) / 2;

  return images.map((item, i) => {
    const offset = i - centerIndex;
    const absOffset = Math.abs(offset);

    return {
      item,
      z: Math.round(10 - absOffset),
      priority: absOffset < 1,
      desktop: {
        stacked: { x: offset * 2, y: offset * -2, rotateZ: offset * 2.5, rotateY: 0 },
        panoramic: { x: offset * 18, y: absOffset * 3, rotateZ: offset * 1.5, rotateY: offset * -12, scale: 1 - absOffset * 0.05 },
        // Les marges valent exactement -50 % de w/h pour garder le centrage.
        size: { w: "28vw", h: "36vh", ml: "-14vw", mt: "-18vh" },
      },
      mobile: {
        stacked: { x: offset * 1.5, y: offset * -1.5, rotateZ: offset * 3, rotateY: 0 },
        panoramic: { x: offset * 16, y: absOffset * 5, rotateZ: offset * 2, rotateY: offset * -15, scale: 1 - absOffset * 0.04 },
        size: { w: "68vw", h: "32vh", ml: "-34vw", mt: "-16vh" },
      },
    };
  });
}

const PROGRESS_SPRING = { stiffness: 80, damping: 25, mass: 0.5, restDelta: 0.001 };
const PARALLAX_SPRING = { stiffness: 50, damping: 25, mass: 0.5 };

function usePointerTilt(active: boolean, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const tiltX = useSpring(rawX, PARALLAX_SPRING);
  const tiltY = useSpring(rawY, PARALLAX_SPRING);

  useEffect(() => {
    if (!enabled || !active) {
      rawX.set(0);
      rawY.set(0);
      return;
    }
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientY / window.innerHeight - 0.5) * -10);
      rawY.set((e.clientX / window.innerWidth - 0.5) * 10);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active, enabled, rawX, rawY]);

  return { tiltX, tiltY };
}

function GalleryCard({
  card,
  progress,
  isMobile,
}: {
  card: Card;
  progress: MotionValue<number>;
  isMobile: boolean;
}) {
  const { item, desktop, mobile, z, priority } = card;
  const { stacked, panoramic, size } = isMobile ? mobile : desktop;

  const ease = useTransform(progress, (p: number) =>
    p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  );

  const xRaw = useTransform(ease, [0, 1], [stacked.x, panoramic.x]);
  const yRaw = useTransform(ease, [0, 1], [stacked.y, panoramic.y]);
  const x = useTransform(xRaw, (v) => `${v}vw`);
  const y = useTransform(yRaw, (v) => `${v}vh`);
  const rotateZ = useTransform(ease, [0, 1], [stacked.rotateZ, panoramic.rotateZ]);
  const rotateY = useTransform(ease, [0, 1], [stacked.rotateY, panoramic.rotateY]);
  const scale = useTransform(ease, [0, 1], [0.75, panoramic.scale]);

  return (
    <div className="pointer-events-none absolute left-1/2 top-[70%]" style={{ zIndex: z }}>
      <motion.div
        className="pointer-events-auto bg-transparent will-change-transform"
        style={{
          width: size.w,
          height: size.h,
          marginLeft: size.ml,
          marginTop: size.mt,
          x,
          y,
          rotateZ,
          rotateY,
          scale,
          transformOrigin: "center center -50px",
        }}
      >
        <div className="group relative h-full w-full bg-transparent">
          <Image
            src={item.src}
            unoptimized
            alt={item.alt}
            fill
            priority={priority}
            draggable={false}
            sizes="(max-width: 768px) 68vw, 28vw"
            className="bg-transparent object-contain transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </motion.div>
    </div>
  );
}

type Props = {
  images: readonly PanoramicImage[];
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  /** Classe de la scène collée à l'écran (idéale pour un fond qui reste fixe pendant le défilement). */
  stageClassName?: string;
};

export default function PanoramicSpreadHero({
  images,
  eyebrow,
  title,
  description,
  className = "",
  stageClassName = "",
}: Props) {
  const wrapRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const cards = useMemo(() => generatePanoramicCards(images), [images]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, PROGRESS_SPRING);
  const scrolled = useTransform(smoothProgress, [0.15, 0.85], [0, 1]);

  // Sans animation : galerie directement dépliée, sans section à faire défiler.
  const spreadOpen = useMotionValue(1);
  const progress = reduce ? spreadOpen : scrolled;

  const [spread, setSpread] = useState(false);
  useMotionValueEvent(scrolled, "change", (p) => setSpread(p > 0.95));
  const { tiltX, tiltY } = usePointerTilt(spread, !reduce);

  return (
    <section ref={wrapRef} className={`relative w-full bg-transparent text-ink ${reduce ? "" : "h-[400vh]"} ${className}`}>
      {/* Collé sous le header du site (h-[5.5rem], md:h-24). */}
      <div
        className={`sticky top-[5.75rem] flex h-[calc(100svh-5.75rem)] w-full justify-center overflow-hidden md:top-[6.5rem] md:h-[calc(100svh-6.5rem)] ${stageClassName}`}
        style={{ perspective: "1200px" }}
      >
        <motion.div
          className="absolute inset-0 z-10"
          style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}
        >
          {cards.map((card) => (
            <GalleryCard key={card.item.src} card={card} progress={progress} isMobile={isMobile} />
          ))}
        </motion.div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-6 pt-5 text-center md:pt-7">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary md:text-xs">{eyebrow}</span>
          <h1 className="mt-3 max-w-[min(1000px,92vw)]">{title}</h1>
          {description ? (
            <p className="mt-3 hidden max-w-[62ch] text-base leading-relaxed text-ink/70 md:block [@media(max-height:700px)]:hidden">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
