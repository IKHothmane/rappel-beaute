"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Driver, DriveStep, PopoverDOM } from "driver.js";
import "driver.js/dist/driver.css";
import "./tutorial.css";
import { useSession } from "@/components/auth/session-provider";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";
import { isAppSession } from "@/lib/auth/types";
import { getTutorial, patchTutorial, type TutorialAction, type TutorialSnapshot, type TutorialStepId } from "./api";
import {
  applyInverseZoom,
  isDesktopNav,
  isModalOpen,
  normalizeAppPath,
  waitForVisibleTarget,
} from "./dom";
import {
  AGENDA_TUTORIAL_REQUEST_EVENT,
  AGENDA_TUTORIAL_STATE_EVENT,
  TUTORIAL_REFRESH_EVENT,
  TUTORIAL_RESTART_EVENT,
  tutorialDeferralKey,
} from "./events";
import { acquireTourLock, releaseTourLock } from "./lock";
import { applicableSteps, isTourStepId, type TourStep } from "./steps";
import { TutorialDialog } from "./tutorial-dialog";
import { TutorialNotice, type TutorialNoticeAction } from "./tutorial-notice";

type Phase = "idle" | "welcome" | "resume" | "touring" | "paused";
type Mode = "nav" | "page";
type Notice = { message: string; tone: "info" | "warning"; actions?: TutorialNoticeAction[]; autoDismiss?: boolean };

type Actions = {
  goTo: (step: TourStep) => void;
  finish: () => Promise<void>;
  skipAll: () => Promise<void>;
  pauseTour: () => void;
  skipStep: (id: string) => void;
  restart: () => Promise<void>;
};

const LOCK_ID = "onboarding";
const NOTICE_AUTO_DISMISS_MS = 9000;

/** Première étape non réussie (ou reprise à la dernière étape mémorisée). */
function pickStart(list: TourStep[], snapshot: TutorialSnapshot | null, resumeFrom?: string | null): TourStep | undefined {
  if (resumeFrom && isTourStepId(resumeFrom)) {
    const resumed = list.find((step) => step.id === resumeFrom);
    if (resumed) return resumed;
  }
  return (snapshot ? list.find((step) => !step.done(snapshot.progress)) : undefined) ?? list[0];
}

/**
 * Moteur du tutoriel de première connexion, monté par AppShell pour le propriétaire (hors pages « bare »).
 * - GET au chargement ; carte de bienvenue / reprise si le serveur le permet (jamais en cas d'erreur).
 * - Parcours déclaratif (steps.ts) joué avec driver.js : une seule étape visible à la fois, navigation par router.push.
 * - Pause automatique quand un panneau/dialogue s'ouvre (le propriétaire fait la vraie action), reprise à sa fermeture
 *   ou sur rb:tutorial-refresh. Aucune donnée factice, aucune écriture automatique.
 */
export function TutorialHost() {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isNavEnabled, loading: planLoading } = usePlanFeatures();

  const isOwner = !!user && isAppSession(user) && user.role === "OWNER" && !user.mustChangePassword;
  const userId = user?.id ?? "";
  const path = normalizeAppPath(pathname);

  const [snap, setSnap] = useState<TutorialSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeId, setActiveId] = useState<TourStep["id"] | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [external, setExternal] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tick, setTick] = useState(0);

  const steps = useMemo(() => (planLoading ? [] : applicableSteps(isNavEnabled)), [planLoading, isNavEnabled]);
  const activeStep = steps.find((step) => step.id === activeId);
  const satisfied = !!activeStep && !!snap && activeStep.done(snap.progress);

  const mounted = useRef(false);
  const loaded = useRef(false);
  const decided = useRef(false);
  const driverRef = useRef<Driver | null>(null);
  const ignoreDestroy = useRef(false);
  const restoreZoom = useRef<(() => void) | null>(null);
  const persisted = useRef<string | null>(null);
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());
  const actionInProgress = useRef(false);
  const skipNav = useRef(false);
  const attempts = useRef<Record<string, number>>({});
  const agendaActive = useRef(false);
  const snapRef = useRef(snap);
  const stepsRef = useRef(steps);
  const activeIdRef = useRef(activeId);
  const presentRef = useRef<(signal: AbortSignal) => Promise<void>>(async () => {});
  const actionsRef = useRef<Actions | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const pushedFor = useRef<string | null>(null);
  phaseRef.current = phase;
  snapRef.current = snap;
  stepsRef.current = steps;
  activeIdRef.current = activeId;

  const dismissKey = tutorialDeferralKey(userId);
  const isDismissed = useCallback(() => {
    try {
      return sessionStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  }, [dismissKey]);
  const setDismissed = useCallback(
    (value: boolean) => {
      try {
        if (value) sessionStorage.setItem(dismissKey, "1");
        else sessionStorage.removeItem(dismissKey);
      } catch {
        /* stockage indisponible : la carte pourra réapparaître, sans conséquence */
      }
    },
    [dismissKey],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // --- Appels serveur (tolérants : un échec ne lève jamais) ----------------------------------------------------
  const act = useCallback((action: TutorialAction, step?: TutorialStepId) => {
    const request = pendingWrite.current.then(async () => {
      if (!mounted.current) return null;
      const result = await patchTutorial(action, step);
      if (!mounted.current) return result;
      if (result) {
        setSnap(result);
      } else {
        // Le serveur a pu avancer depuis le dernier affichage.
        const fresh = await getTutorial();
        if (fresh && mounted.current) setSnap(fresh);
      }
      return result;
    });
    pendingWrite.current = request.then(() => undefined, () => undefined);
    return request;
  }, []);

  const persistStep = useCallback(
    (id: TutorialStepId) => {
      if (persisted.current === id) return;
      persisted.current = id;
      void act("step", id).then((result) => {
        if (!result && persisted.current === id) persisted.current = null;
      });
    },
    [act],
  );

  // --- Driver --------------------------------------------------------------------------------------------------
  const cleanupDriver = useCallback(() => {
    restoreZoom.current?.();
    restoreZoom.current = null;
    releaseTourLock(LOCK_ID);
  }, []);

  /** Détruit le driver sans changer l'état serveur (changement d'étape, panneau ouvert, navigation…). */
  const destroyDriver = useCallback(() => {
    const current = driverRef.current;
    driverRef.current = null;
    if (current) {
      ignoreDestroy.current = true;
      try {
        current.destroy();
      } catch {
        /* déjà détruit */
      }
      ignoreDestroy.current = false;
    }
    cleanupDriver();
  }, [cleanupDriver]);

  useEffect(() => () => destroyDriver(), [destroyDriver]);

  // --- Actions du parcours -------------------------------------------------------------------------------------
  const showNotice = useCallback((next: Notice | null) => setNotice(next), []);
  const showUnavailable = useCallback(() => showNotice({
    message: "Le tutoriel n’est pas disponible pour le moment. Réessayez dans quelques instants.",
    tone: "warning",
    autoDismiss: true,
  }), [showNotice]);

  const beginTour = useCallback(
    (step: TourStep) => {
      skipNav.current = false;
      attempts.current = {};
      setNotice(null);
      setActiveId(step.id);
      setPhase("touring");
      persistStep(step.id);
    },
    [persistStep],
  );

  const goTo = useCallback(
    (target: TourStep) => {
      if (actionInProgress.current) return;
      destroyDriver();
      skipNav.current = true; // on navigue nous-mêmes : pas de détour par la sidebar
      attempts.current = {};
      setNotice(null);
      persistStep(target.id);
      setActiveId(target.id);
      const here = `${normalizeAppPath(window.location.pathname)}${window.location.search}`;
      if (here !== target.route) {
        pushedFor.current = target.id; // l'effet d'affichage ne doit pas re-pousser avant l'arrivée sur la page
        router.push(target.route);
      }
    },
    [destroyDriver, persistStep, router],
  );

  const finish = useCallback(async () => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    const result = await act("complete");
    actionInProgress.current = false;
    if (!mounted.current) return;
    if (!result) { showUnavailable(); return; }
    destroyDriver();
    setPhase("idle");
    setActiveId(null);
    showNotice({
      message: "Bravo, le tutoriel est terminé. Vous pouvez le revoir à tout moment avec « Revoir le tutoriel ».",
      tone: "info",
      autoDismiss: true,
    });
  }, [act, destroyDriver, showNotice, showUnavailable]);

  const skipAll = useCallback(async () => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    const result = await act("skip");
    actionInProgress.current = false;
    if (!mounted.current) return;
    if (!result) { showUnavailable(); return; }
    destroyDriver();
    setPhase("idle");
    setActiveId(null);
    setDismissed(true);
    showNotice({
      message: "Tutoriel ignoré. Vous pouvez le relancer à tout moment avec « Revoir le tutoriel ».",
      tone: "info",
      autoDismiss: true,
    });
  }, [act, destroyDriver, setDismissed, showNotice, showUnavailable]);

  const pauseTour = useCallback(() => {
    if (actionInProgress.current) return;
    destroyDriver();
    setPhase("paused");
    setDismissed(true);
    const id = activeIdRef.current;
    void act("pause", id ?? undefined);
    showNotice({
      message: "Tutoriel mis en pause. Il vous sera reproposé à votre prochaine visite.",
      tone: "info",
      autoDismiss: true,
      actions: [
        {
          label: "Reprendre",
          primary: true,
          onClick: () => {
            setNotice(null);
            setPhase("touring");
            setTick((value) => value + 1);
          },
        },
      ],
    });
  }, [act, destroyDriver, setDismissed, showNotice]);

  const skipStep = useCallback(
    (id: string) => {
      const list = stepsRef.current;
      const index = list.findIndex((step) => step.id === id);
      const next = list[index + 1];
      if (next) goTo(next);
      else void finish();
    },
    [finish, goTo],
  );

  const restart = useCallback(async () => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    destroyDriver();
    setNotice(null);
    const result = await act("reset");
    actionInProgress.current = false;
    if (!mounted.current) return;
    const list = stepsRef.current;
    if (!result || list.length === 0) {
      showUnavailable();
      setTick((value) => value + 1);
      return;
    }
    setDismissed(false);
    persisted.current = null;
    const [first] = list;
    if (first) beginTour(first);
  }, [act, beginTour, destroyDriver, setDismissed, showUnavailable]);

  const startFromDialog = useCallback(async () => {
    if (actionInProgress.current) return;
    const list = stepsRef.current;
    const current = snapRef.current;
    const kind = phaseRef.current;
    if (list.length === 0 || !current) return;
    actionInProgress.current = true;
    const latest = kind === "welcome" ? await act("start") : current;
    actionInProgress.current = false;
    if (!mounted.current) return;
    if (kind !== phaseRef.current) return;
    if (!latest) { showUnavailable(); return; }
    const first = pickStart(list, latest, kind === "resume" ? current.tutorial?.lastStep : null);
    if (first) beginTour(first);
  }, [act, beginTour, showUnavailable]);

  actionsRef.current = { goTo, finish, skipAll, pauseTour, skipStep, restart };

  // --- Chargement initial et décision d'affichage ---------------------------------------------------------------
  useEffect(() => {
    if (!isOwner || loaded.current) return;
    loaded.current = true;
    void getTutorial().then((result) => {
      // Erreur/404/500 : `result` est null, aucun tutoriel n'est affiché et on ne réessaie pas.
      if (result && mounted.current) setSnap(result);
    });
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner || phase !== "idle" || decided.current || !snap || planLoading || path.startsWith("/security/")) return;
    const tutorial = snap.tutorial;
    if (!snap.eligible || !tutorial) {
      decided.current = true;
      return;
    }
    if (isDismissed()) {
      decided.current = true;
      return;
    }
    if (steps.length === 0) return;
    decided.current = true;
    if (tutorial.status === "NOT_STARTED") setPhase("welcome");
    else if (tutorial.status === "IN_PROGRESS") setPhase("resume");
  }, [isOwner, phase, snap, planLoading, path, steps.length, isDismissed]);

  // --- Événements : succès d'une action, relance, visite détaillée de l'agenda ---------------------------------
  useEffect(() => {
    if (!isOwner) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let agendaTimer: ReturnType<typeof setTimeout> | undefined;
    const onRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const fresh = await getTutorial();
        if (fresh && mounted.current) setSnap(fresh);
      }, 200);
    };
    const onRestart = () => void actionsRef.current?.restart();
    const onAgendaState = (event: Event) => {
      const active = (event as CustomEvent<{ active?: boolean }>).detail?.active === true;
      agendaActive.current = active;
      setExternal(active);
    };
    const onAgendaRequest = () => {
      // Émis par notre propre bouton : on cède la place, avec un filet si l'agenda ne répond pas.
      setExternal(true);
      clearTimeout(agendaTimer);
      agendaTimer = setTimeout(() => {
        if (!agendaActive.current) setExternal(false);
      }, 3000);
    };
    window.addEventListener(TUTORIAL_REFRESH_EVENT, onRefresh);
    window.addEventListener(TUTORIAL_RESTART_EVENT, onRestart);
    window.addEventListener(AGENDA_TUTORIAL_STATE_EVENT, onAgendaState);
    window.addEventListener(AGENDA_TUTORIAL_REQUEST_EVENT, onAgendaRequest);
    return () => {
      clearTimeout(timer);
      clearTimeout(agendaTimer);
      window.removeEventListener(TUTORIAL_REFRESH_EVENT, onRefresh);
      window.removeEventListener(TUTORIAL_RESTART_EVENT, onRestart);
      window.removeEventListener(AGENDA_TUTORIAL_STATE_EVENT, onAgendaState);
      window.removeEventListener(AGENDA_TUTORIAL_REQUEST_EVENT, onAgendaRequest);
    };
  }, [isOwner]);

  // --- Pause automatique quand un panneau / dialogue s'ouvre ---------------------------------------------------
  const wasPanelOpen = useRef(false);
  useEffect(() => {
    if (phase !== "touring") {
      setPanelOpen(false);
      return;
    }
    let frame = 0;
    const check = () => {
      frame = 0;
      const open = isModalOpen();
      if (open) destroyDriver(); // avant que la couche du tutoriel (z-10000) ne recouvre le panneau (z-200)
      setPanelOpen((previous) => (previous === open ? previous : open));
    };
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(check);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [phase, destroyDriver]);

  useEffect(() => {
    // Panneau refermé : on relit la progression au cas où l'événement de succès aurait été manqué.
    if (wasPanelOpen.current && !panelOpen && phase === "touring") {
      void getTutorial().then((fresh) => {
        if (fresh && mounted.current) setSnap(fresh);
      });
    }
    wasPanelOpen.current = panelOpen;
  }, [panelOpen, phase]);

  // --- Affichage de l'étape active ----------------------------------------------------------------------------
  presentRef.current = async (signal: AbortSignal) => {
    const step = activeStep;
    if (!step) return;
    const index = steps.findIndex((item) => item.id === step.id);
    const desktop = isDesktopNav();
    const onRoute = path === step.pathname;
    let mode: Mode = "page";

    if (!onRoute) {
      if (desktop && !skipNav.current) {
        mode = "nav";
      } else if (pushedFor.current === step.id) {
        pushedFor.current = null; // navigation déjà demandée : on attend le changement de page
        return;
      } else {
        attempts.current[step.id] = (attempts.current[step.id] ?? 0) + 1;
        if (attempts.current[step.id] > 2) {
          showNotice({
            message: `La page « ${step.navLabel} » n’est pas accessible avec votre forfait ou vos droits. Vous pouvez passer cette étape.`,
            tone: "warning",
            actions: [{ label: "Passer cette étape", primary: true, onClick: () => actionsRef.current?.skipStep(step.id) }],
          });
          return;
        }
        router.push(step.route);
        return;
      }
    }

    const selectors = mode === "nav" ? [`[data-tour="${step.navTarget}"]`] : step.targets;
    let target: HTMLElement;
    try {
      target = await waitForVisibleTarget(selectors, signal, mode === "page");
    } catch {
      if (signal.aborted) return;
      if (mode === "nav") {
        skipNav.current = true;
        router.push(step.route);
        return;
      }
      const last = index === steps.length - 1;
      showNotice({
        message: "Nous ne trouvons pas cette zone sur la page (elle peut être indisponible avec vos droits ou votre forfait). Vous pouvez passer l’étape.",
        tone: "warning",
        actions: [
          {
            label: last ? "Terminer le tutoriel" : "Passer cette étape",
            primary: true,
            onClick: () => actionsRef.current?.skipStep(step.id),
          },
          {
            label: "Réessayer",
            onClick: () => {
              setNotice(null);
              setTick((value) => value + 1);
            },
          },
        ],
      });
      return;
    }

    const { driver } = await import("driver.js");
    if (signal.aborted || !mounted.current) return;
    if (!acquireTourLock(LOCK_ID)) return;
    setNotice((current) => (current?.tone === "warning" ? null : current));

    const last = index === steps.length - 1;
    const title = mode === "nav" ? `Ouvrez « ${step.navLabel} »` : step.title;
    const description = mode === "nav" ? step.navDescription : step.description;
    const nextText = mode === "nav" ? `Ouvrir ${step.navLabel}` : last ? "Terminer" : satisfied ? "Étape suivante" : "Suivant";
    const actions = () => actionsRef.current;

    const advance = () => {
      if (mode === "nav") {
        destroyDriver();
        skipNav.current = true;
        router.push(step.route);
        return;
      }
      const next = steps[index + 1];
      if (next) actions()?.goTo(next);
      else void actions()?.finish();
    };
    const back = () => {
      const previous = steps[index - 1];
      if (previous) actions()?.goTo(previous);
    };

    const driveSteps: DriveStep[] = steps.map((item, position) =>
      position === index
        ? {
            element: target,
            popover: {
              title,
              description,
              side: mode === "nav" ? "right" : "bottom",
              align: "center",
              nextBtnText: nextText,
              doneBtnText: nextText,
              onNextClick: advance,
              onDoneClick: advance,
              onPrevClick: back,
            },
          }
        : { popover: { title: item.title, description: item.description } },
    );

    restoreZoom.current?.();
    restoreZoom.current = applyInverseZoom();
    const instance: Driver = driver({
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
      closeBtnLabel: "Mettre le tutoriel en pause",
      allowKeyboardControl: true,
      onPopoverRender: (popover) => decoratePopover(popover, {
        satisfiedText: mode === "page" && satisfied ? step.successText : null,
        agenda: mode === "page" && step.id === "agenda",
        onSkipAll: () => void actions()?.skipAll(),
        onAgenda: () => {
          destroyDriver();
          window.dispatchEvent(new CustomEvent(AGENDA_TUTORIAL_REQUEST_EVENT));
        },
      }),
      onDestroyed: (_element, _step, opts) => {
        if (driverRef.current === instance) {
          driverRef.current = null;
          cleanupDriver();
        }
        if (ignoreDestroy.current) return;
        const reason = opts.reason;
        if (reason === "close" || reason === "escape" || reason === "overlay" || reason === undefined) {
          actions()?.pauseTour();
        }
      },
    });
    driverRef.current = instance;
    instance.drive(index);
  };

  useEffect(() => {
    if (phase !== "touring" || !activeId || panelOpen || external) return;
    const abort = new AbortController();
    void presentRef.current(abort.signal).catch(() => {
      /* annulation ou échec de chargement : aucun blocage */
    });
    return () => {
      abort.abort();
      destroyDriver();
    };
  }, [phase, activeId, path, panelOpen, external, satisfied, tick, steps, destroyDriver]);

  // Annonce de fin / pause : disparition automatique.
  useEffect(() => {
    if (!notice?.autoDismiss) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!isOwner) return null;

  return (
    <>
      {phase === "welcome" || phase === "resume" ? (
        <TutorialDialog
          kind={phase}
          onStart={() => void startFromDialog()}
          onLater={() => {
            setDismissed(true);
            setPhase("idle");
          }}
        />
      ) : null}
      {notice ? (
        <TutorialNotice
          message={notice.message}
          tone={notice.tone}
          actions={notice.actions}
          onDismiss={() => setNotice(null)}
        />
      ) : null}
    </>
  );
}

type DecorateOptions = {
  satisfiedText: string | null;
  agenda: boolean;
  onSkipAll: () => void;
  onAgenda: () => void;
};

/** Ajoute à la bulle driver.js le message de réussite et les actions secondaires (Passer, visite détaillée). */
function decoratePopover(popover: PopoverDOM, options: DecorateOptions) {
  popover.wrapper.setAttribute("data-rb-tutorial", "");
  popover.wrapper.querySelector(".app-tour-success")?.remove();
  popover.wrapper.querySelector(".app-tour-extra")?.remove();

  if (options.satisfiedText) {
    const success = document.createElement("p");
    success.className = "app-tour-success";
    success.setAttribute("role", "status");
    success.textContent = options.satisfiedText;
    popover.description.insertAdjacentElement("afterend", success);
  }

  const row = document.createElement("div");
  row.className = "app-tour-extra";
  const add = (label: string, ariaLabel: string, onClick: () => void) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "app-tour-link";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", onClick);
    row.appendChild(button);
  };
  if (options.agenda) add("Visite détaillée de l’agenda", "Lancer la visite détaillée de l’agenda", options.onAgenda);
  add("Passer", "Passer le tutoriel : il ne sera plus proposé automatiquement", options.onSkipAll);
  popover.wrapper.insertBefore(row, popover.footer);
}
