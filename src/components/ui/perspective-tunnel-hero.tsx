"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

export type TunnelImage = { src: string; title: string };

type TunnelCardData = {
  item: TunnelImage;
  angleCos: number;
  angleSin: number;
  radiusFactorX: number;
  radiusFactorY: number;
  rotationZ: number;
  index: number;
};

type StageDimensions = {
  width: number;
  height: number;
  isMobile: boolean;
};

const SPRING = { stiffness: 60, damping: 25, mass: 0.5 };

function useCameraParallax(enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      rawX.set((event.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((event.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, rawX, rawY]);

  return { x, y };
}

function TunnelCard({
  card,
  progress,
  pointer,
  total,
  stage,
}: {
  card: TunnelCardData;
  progress: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  total: number;
  stage: StageDimensions;
}) {
  const staggerSpan = 0.55;
  const start = (card.index / total) * (1 - staggerSpan);
  const end = start + staggerSpan;
  const localProgress = useTransform(progress, [start, end], [0, 1]);
  const farZ = stage.isMobile ? -900 : -1400;
  const z = useTransform(localProgress, [0, 1], [farZ, 0]);
  const opacity = useTransform(localProgress, [0, 0.22, 1], [0, 1, 1]);
  const cardWidth = stage.isMobile
    ? Math.max(112, Math.min(150, stage.width * 0.32))
    : Math.max(168, Math.min(230, stage.width * 0.15));
  const baseX = card.angleCos * (stage.width * card.radiusFactorX);
  const baseY = card.angleSin * (stage.height * card.radiusFactorY);
  const panStrength = stage.isMobile ? 12 : 28;
  const transform = useTransform([z, pointer.x, pointer.y], ([currZ, px, py]: number[]) => {
    const offsetX = baseX - px * panStrength;
    const offsetY = baseY - py * panStrength;
    return `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${currZ}px) rotateZ(${card.rotationZ}deg)`;
  });

  return (
    <motion.div
      style={{ width: cardWidth, transform, opacity, zIndex: card.index + 1 }}
      className="pointer-events-none absolute left-1/2 top-1/2 aspect-[16/10] will-change-transform select-none"
    >
      <div className="relative h-full w-full">
        <Image
          src={card.item.src}
          alt={card.item.title}
          fill
          draggable={false}
          sizes="320px"
          priority={card.index < 2}
          className="object-contain"
        />
      </div>
    </motion.div>
  );
}

export default function PerspectiveTunnelHero({
  images,
  eyebrow,
  title,
  description,
}: {
  images: readonly TunnelImage[];
  eyebrow: string;
  title: ReactNode;
  description: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<StageDimensions>({
    width: 1200,
    height: 640,
    isMobile: false,
  });

  const cards = useMemo<TunnelCardData[]>(
    () =>
      images.map((item, index) => {
        const goldenAngle = index * 137.5 * (Math.PI / 180);
        return {
          item,
          angleCos: Math.cos(goldenAngle),
          angleSin: Math.sin(goldenAngle),
          radiusFactorX: 0.34 + (index % 3) * 0.05,
          radiusFactorY: 0.3 + (index % 2) * 0.06,
          rotationZ: (index % 2 === 0 ? 1 : -1) * (2 + (index % 4)),
          index,
        };
      }),
    [images],
  );

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setStage({
        width: rect.width,
        height: rect.height,
        isMobile: rect.width < 768,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const still = useMotionValue(0.42);
  const progress = reduce ? still : scrollYProgress;
  const pointer = useCameraParallax(!reduce);
  const promptOpacity = useTransform(progress, [0, 0.12], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className={reduce ? "fn-tunnel fn-tunnel-static" : "fn-tunnel"}
      aria-label="Fonctionnalités de Rappel Beauty"
    >
      <div
        ref={stageRef}
        className="fn-tunnel-stage sticky top-[var(--vt-size-4p75rem)] flex h-[calc(100svh-var(--vt-size-4p75rem))] items-center justify-center overflow-hidden md:top-[var(--vt-size-5p5rem)] md:h-[calc(100svh-var(--vt-size-5p5rem))]"
        style={{
          perspective: stage.isMobile ? "900px" : "1200px",
          transformStyle: "preserve-3d",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#f3c2d6_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_55%,transparent_100%)] opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,0,80,0.12)_0%,transparent_68%)]" />
        <div className="pointer-events-none absolute h-[42vmin] w-[42vmin] rounded-full border border-[#e7a3c0]/40" />
        <div className="pointer-events-none absolute h-[68vmin] w-[68vmin] rounded-full border border-dashed border-[#efd0de]" />

        <div className="fn-tunnel-copy pointer-events-none relative z-0 flex max-w-xl flex-col items-center px-6 text-center">
          <p className="fn-badge">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="fn-lead">{description}</p>
        </div>

        <motion.p style={{ opacity: promptOpacity }} className="fn-tunnel-prompt">
          Défilez pour explorer
        </motion.p>

        <div className="pointer-events-none absolute inset-0 z-10" style={{ transformStyle: "preserve-3d" }}>
          {cards.map((card) => (
            <TunnelCard
              key={card.item.src}
              card={card}
              progress={progress}
              pointer={pointer}
              total={cards.length}
              stage={stage}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
