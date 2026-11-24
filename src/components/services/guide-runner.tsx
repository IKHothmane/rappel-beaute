"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import type { Driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/components/tutorial/tutorial.css";
import {
  applyInverseZoom,
  findVisibleTarget,
  isModalOpen,
  TargetUnavailableError,
  waitForVisibleTarget,
} from "@/components/tutorial/dom";
import { AGENDA_TUTORIAL_STATE_EVENT } from "@/components/tutorial/events";
import { acquireTourLock, releaseTourLock } from "@/components/tutorial/lock";
import {
  createGuideSession,
  describeGuideStep,
  nextButtonLabel,
  resolveGuideSteps,
  waitUntilReady,
  widthBucketOf,
  type GuideSession,
  type GuideStep,
  type ResolvedStep,
} from "@/components/services/guide-core";

/** Délai maximal d'attente des données secondaires (analytique, options…) : la visite démarre ensuite quoi qu'il arrive. */
const READY_TIMEOUT_MS = 6000;

export type PageGuideProps = {
  /** Identifiant du verrou : une seule visite guidée à la fois (parcours de première connexion, agenda, équipe…). */
  lockId: string;
  /** Nom de l'attribut data-* qui repère les zones de la page (ex. data-services-tour). */
  attr: string;
  /** Valeur de la zone racine : elle porte data-loading="false" une fois les données chargées. */
  rootTarget: string;
  steps: readonly GuideStep[];
  canWrite: boolean;
  /** Champ de formulaire non modifiable pour ce rôle (ex. tarif) : texte alternatif des étapes concernées. */
  locked?: boolean;
  /** Conditions calculées au démarrage (formulaire disponible, prestations à associer…). Lecture seule : aucune écriture. */
  prepare: () => Promise<Record<string, boolean>> | Record<string, boolean>;
  /** Ouvre (valeur) ou ferme (null) le formulaire de démonstration correspondant : aucune écriture. Appelé avec null à chaque sortie. */
  onDemoChange: (demo: string | null) => void;
  /**
   * Indicateur « visite active », posé dès la prise du verrou (avant le chargement) et retiré à la fin de la visite.
   * La page s'en sert pour refuser toute écriture et tout tiroir réel pendant ce temps, y compris pendant les étapes de page.
   */
  onActiveChange?: (active: boolean) => void;
  /**
   * Données secondaires chargées (indicateurs, options…). La visite les attend au plus quelques secondes, sans bloquer.
   * Omis : aucune attente (comportement inchangé).
   */
  ready?: boolean;
};

function waitForSelector(selector: string, signal: AbortSignal, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const frame = () => {
      if (signal.aborted) {
        reject(new DOMException("Annulé", "AbortError"));
        return;
      }
      if (document.querySelector(selector)) {
        resolve();
        return;
      }
      if (performance.now() - started > timeoutMs) {
        reject(new TargetUnavailableError());
        return;
      }
      requestAnimationFrame(frame);
    };
    frame();
  });
}

/**
 * Bouton « Tutoriel » et visite détaillée en mode démonstration d'une page à double rendu (mobile et large dans le DOM).
 * Les étapes sont calculées au démarrage ; chaque cible est retrouvée à chaque étape (jamais un nœud capturé), si bien
 * que la version visible de la page est toujours celle qui est mise en avant.
 */
export function PageGuide({ lockId, attr, rootTarget, steps: allSteps, canWrite, locked, prepare, onDemoChange, onActiveChange, ready }: PageGuideProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tourRef = useRef<Driver | null>(null);
  const runRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<GuideSession | null>(null);
  const callbacks = useRef({ prepare, onDemoChange, onActiveChange, canWrite, locked, ready });
  callbacks.current = { prepare, onDemoChange, onActiveChange, canWrite, locked, ready };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    runRef.current?.abort();
    if (tourRef.current) {
      tourRef.current.destroy();
    } else if (runRef.current) {
      runRef.current = null;
      sessionRef.current?.end();
      sessionRef.current = null;
    }
  }, [lockId]);

  async function start() {
    if (runRef.current) return;
    if (isModalOpen()) {
      setError("Fermez la fenêtre ouverte avant de lancer le tutoriel.");
      return;
    }
    const session = createGuideSession({
      acquire: () => acquireTourLock(lockId),
      release: () => releaseTourLock(lockId),
      onDemoChange: (demo) => callbacks.current.onDemoChange(demo),
      onActiveChange: (active) => callbacks.current.onActiveChange?.(active),
      announce: (active) => window.dispatchEvent(new CustomEvent(AGENDA_TUTORIAL_STATE_EVENT, { detail: { active } })),
    });
    // L'indicateur « visite active » est posé ici, avant tout chargement : la page refuse déjà les écritures.
    if (!session.begin()) {
      setError("Fermez le tutoriel en cours avant d’ouvrir cette visite.");
      return;
    }
    sessionRef.current = session;

    const selectorFor = (target: string) => `[${attr}="${target}"]`;
    const run = new AbortController();
    runRef.current = run;
    setLoading(true);
    setError(null);
    let restoreZoom: (() => void) | undefined;
    let steps: ResolvedStep[] = [];
    let moving = false;
    const bucket = widthBucketOf(window.innerWidth);
    // Les mises en page mobile, tablette et large n'affichent pas les mêmes zones : on referme la visite si elle bascule.
    const onResize = () => {
      if (widthBucketOf(window.innerWidth) !== bucket) tourRef.current?.destroy();
    };

    function cleanup() {
      if (runRef.current !== run) return;
      const restoreFocus = !run.signal.aborted;
      run.abort();
      window.removeEventListener("resize", onResize);
      restoreZoom?.();
      session.end();
      if (sessionRef.current === session) sessionRef.current = null;
      runRef.current = null;
      tourRef.current = null;
      if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    }

    async function showStep(index: number) {
      if (moving || run.signal.aborted || index < 0) return;
      if (index >= steps.length) {
        tourRef.current?.destroy();
        return;
      }
      moving = true;
      const step = steps[index];
      try {
        session.setDemo(step.demo ?? null);
        await waitForVisibleTarget([selectorFor(step.target)], run.signal, true);
        if (!run.signal.aborted) tourRef.current?.moveTo(index);
      } catch {
        if (!run.signal.aborted) {
          setError("Cette étape n’a pas pu s’afficher. Fermez la visite puis réessayez.");
          tourRef.current?.destroy();
        }
      } finally {
        moving = false;
      }
    }

    try {
      const { driver } = await import("driver.js");
      if (run.signal.aborted) return;
      // Attend la fin du chargement des données : les cartes et la fiche en dépendent.
      await waitForSelector(`${selectorFor(rootTarget)}[data-loading="false"]`, run.signal);
      if (run.signal.aborted) return;
      // Données secondaires (indicateurs, options) : attente bornée, jamais bloquante.
      await waitUntilReady(() => callbacks.current.ready !== false, run.signal, READY_TIMEOUT_MS);
      if (run.signal.aborted) return;
      const write = callbacks.current.canWrite;
      const flags = write ? await callbacks.current.prepare() : {};
      if (run.signal.aborted) return;
      steps = resolveGuideSteps(allSteps, {
        canWrite: write,
        flags,
        isPresent: (target) => Boolean(findVisibleTarget([selectorFor(target)], true)),
      });
      if (steps.length === 0) throw new Error("Aucune étape disponible.");
      await waitForVisibleTarget([selectorFor(steps[0].target)], run.signal, true);
      if (run.signal.aborted) return;
      // Une fenêtre a pu s'ouvrir pendant les chargements : on ne superpose pas la visite.
      if (isModalOpen()) {
        setError("Fermez la fenêtre ouverte avant de lancer le tutoriel.");
        return;
      }

      restoreZoom = applyInverseZoom();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const lastIndex = steps.length - 1;
      const view = { canWrite: write, wide, locked: callbacks.current.locked };
      const driveSteps: DriveStep[] = steps.map((step) => ({
        element: () => findVisibleTarget([selectorFor(step.target)], true) as HTMLElement,
        disableActiveInteraction: true,
        popover: {
          title: step.number ? `${step.number}. ${step.title}` : step.title,
          description: describeGuideStep(step, view),
          side: step.demo && wide ? "left" : "bottom",
          align: "center",
          nextBtnText: nextButtonLabel(step, lastIndex),
        },
      }));
      tourRef.current = driver({
        steps: driveSteps,
        animate: false,
        smoothScroll: false,
        stagePadding: 6,
        stageRadius: 12,
        overlayOpacity: 0.55,
        overlayClickBehavior: "none",
        popoverClass: "app-tour-popover",
        showProgress: true,
        progressText: "Étape {{current}} sur {{total}}",
        nextBtnText: "Suivant",
        prevBtnText: "Précédent",
        doneBtnText: "Terminer",
        closeBtnLabel: "Fermer le tutoriel",
        onNextClick: () => void showStep((tourRef.current?.getActiveIndex() ?? 0) + 1),
        onPrevClick: () => void showStep((tourRef.current?.getActiveIndex() ?? 0) - 1),
        onDestroyed: cleanup,
      });
      window.addEventListener("resize", onResize);
      session.announceStart();
      tourRef.current.drive();
    } catch {
      if (!run.signal.aborted) setError("Impossible de démarrer le tutoriel. Réessayez.");
      tourRef.current?.destroy();
    } finally {
      if (!run.signal.aborted) setLoading(false);
      if (!tourRef.current) cleanup();
    }
  }

  return (
    <div className="min-w-0 max-sm:w-full max-sm:[&>button]:w-full max-sm:[&>button]:justify-center">
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        onClick={() => void start()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#F0D9E3] bg-white/90 px-3 text-sm font-semibold text-[#7D3152] shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AC0E4C] disabled:opacity-60"
      >
        <BookOpen size={17} aria-hidden /> {loading ? "Chargement…" : "Tutoriel"}
      </button>
      {error ? <p role="alert" className="mt-1 max-w-xs text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
