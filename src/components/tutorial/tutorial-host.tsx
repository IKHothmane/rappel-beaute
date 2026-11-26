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
  findVisibleTarget,
  isDesktopNav,
  isModalOpen,
  normalizeAppPath,
  waitForVisibleTarget,
} from "./dom";
import {
  AGENDA_TUTORIAL_REQUEST_EVENT,
  AGENDA_TUTORIAL_STATE_EVENT,
  TUTORIAL_REFRESH_EVENT,
  tutorialDeferralKey,
} from "./events";
import { useTutorialRestart } from "./tutorial-restart";
import { acquireTourLock, isTourLockAvailable, releaseTourLock } from "./lock";
import {
  decideNavigation,
  emptyNavState,
  LOCK_BUSY_MESSAGE,
  NAV_FAILED_MESSAGE,
  NAV_LEFT_MESSAGE,
  shouldReleaseExternal,
  startOutcome,
  trackPush,
  type ActAck,
  type NavState,
} from "./logic";
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
};

const LOCK_ID = "onboarding";
const NOTICE_AUTO_DISMISS_MS = 9000;
/** Délai laissé à une navigation de l'hôte avant de la déclarer échouée (redirection vers une autre page, réseau). */
const PUSH_TIMEOUT_MS = 12000;
/** Après une demande de visite externe : délai avant de vérifier qu'elle a bien démarré (puis reprise si le verrou est libre). */
const EXTERNAL_FALLBACK_MS = 10000;
/** Temps laissé à la cible principale d'une étape avant de se contenter de sa cible de repli (onglet qui change). */
const PRIMARY_TARGET_GRACE_MS = 1500;

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
  const restartRequest = useTutorialRestart();
  const restartStatus = restartRequest?.status;
  const restartPending = restartStatus === "queued" || restartStatus === "running";
  const claimRestart = restartRequest?.claim;
  const finishRestart = restartRequest?.finish;
  const requestRestart = restartRequest?.request;

  const isOwner = !!user && isAppSession(user) && user.role === "OWNER" && !user.mustChangePassword;
  const userId = user?.id ?? "";
  const path = normalizeAppPath(pathname);

  const [snap, setSnap] = useState<TutorialSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeId, setActiveId] = useState<TourStep["id"] | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [external, setExternal] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [announcement, setAnnouncement] = useState("");
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
  const snapshotGeneration = useRef(0);
  const actionInProgress = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const markActionBusy = useCallback((busy: boolean) => {
    actionInProgress.current = busy;
    setActionBusy(busy);
  }, []);
  const skipNav = useRef(false);
  const nav = useRef<NavState>(emptyNavState());
  const pushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lockBlocked = useRef(false);
  const lastTarget = useRef<HTMLElement | null>(null);
  const agendaActive = useRef(false);
  const snapRef = useRef(snap);
  const stepsRef = useRef(steps);
  const activeIdRef = useRef(activeId);
  const presentRef = useRef<(signal: AbortSignal) => Promise<void>>(async () => {});
  const actionsRef = useRef<Actions | null>(null);
  const phaseRef = useRef<Phase>(phase);
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
  // `ok` : l'écriture a abouti. Sinon (409, réseau, 503), `snapshot` est l'état relu par GET (nul si le GET échoue aussi).
  const refreshSnapshot = useCallback(async () => {
    const generation = snapshotGeneration.current;
    const fresh = await getTutorial();
    if (fresh && mounted.current && generation === snapshotGeneration.current) setSnap(fresh);
    return fresh;
  }, []);

  const act = useCallback((action: TutorialAction, step?: TutorialStepId) => {
    const request = pendingWrite.current.then(async (): Promise<ActAck> => {
      if (!mounted.current) return { ok: false, snapshot: null };
      const result = await patchTutorial(action, step);
      if (!mounted.current) return { ok: !!result, snapshot: result };
      if (result) {
        snapshotGeneration.current += 1;
        setSnap(result);
        return { ok: true, snapshot: result };
      }
      // Le serveur a pu avancer depuis le dernier affichage.
      const fresh = await refreshSnapshot();
      return { ok: false, snapshot: fresh };
    });
    pendingWrite.current = request.then(() => undefined, () => undefined);
    return request;
  }, [refreshSnapshot]);

  const persistStep = useCallback(
    (id: TutorialStepId) => {
      if (persisted.current === id) return;
      persisted.current = id;
      void act("step", id).then((result) => {
        if (!result.ok && persisted.current === id) persisted.current = null;
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

  /** Rend le focus à la zone qui était mise en avant (la bulle, qui le portait, vient d'être détruite). */
  const restoreFocus = useCallback(() => {
    const target = lastTarget.current;
    lastTarget.current = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }, []);

  const clearPushTimer = useCallback(() => {
    clearTimeout(pushTimer.current);
    pushTimer.current = undefined;
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

  useEffect(() => () => {
    destroyDriver();
    clearTimeout(pushTimer.current);
  }, [destroyDriver]);

  // --- Actions du parcours -------------------------------------------------------------------------------------
  const showNotice = useCallback((next: Notice | null) => setNotice(next), []);
  const showUnavailable = useCallback(() => showNotice({
    message: "Le tutoriel n’est pas disponible pour le moment. Réessayez dans quelques instants.",
    tone: "warning",
    autoDismiss: true,
  }), [showNotice]);

  /** La page de l'étape n'a pas pu s'afficher (cause inconnue : on ne l'attribue ni au forfait ni aux droits). */
  const showNavFailure = useCallback(
    (step: TourStep) => {
      const list = stepsRef.current;
      const last = list[list.length - 1]?.id === step.id;
      showNotice({
        message: NAV_FAILED_MESSAGE,
        tone: "warning",
        actions: [
          {
            label: "Réessayer",
            primary: true,
            onClick: () => {
              nav.current.blocked = null;
              nav.current.pending = null;
              setNotice(null);
              setTick((value) => value + 1);
            },
          },
          { label: last ? "Terminer le tutoriel" : "Passer cette étape", onClick: () => actionsRef.current?.skipStep(step.id) },
        ],
      });
    },
    [showNotice],
  );

  /**
   * Navigation demandée par l'hôte. Elle n'est suivie (`pending`) que si le pathname change : une simple query
   * (équipe -> planning) ne se « reçoit » jamais et resterait périmée. Un délai déclare l'échec d'une navigation
   * qui n'aboutit pas (redirection, réseau) sans qu'aucun changement de page ne relance l'effet d'affichage.
   */
  const pushRoute = useCallback(
    (step: TourStep) => {
      const from = normalizeAppPath(window.location.pathname);
      const pending = trackPush(step.id, from, step.pathname);
      nav.current.pending = pending;
      clearPushTimer();
      if (pending) {
        pushTimer.current = setTimeout(() => {
          pushTimer.current = undefined;
          const state = nav.current;
          if (!mounted.current || state.pending?.stepId !== step.id) return;
          if (activeIdRef.current !== step.id || phaseRef.current !== "touring") return;
          state.pending = null;
          state.blocked = step.id;
          showNavFailure(step);
        }, PUSH_TIMEOUT_MS);
      }
      router.push(step.route);
    },
    [clearPushTimer, router, showNavFailure],
  );

  const beginTour = useCallback(
    (step: TourStep) => {
      skipNav.current = false;
      nav.current = emptyNavState();
      lockBlocked.current = false;
      clearPushTimer();
      setNotice(null);
      setActiveId(step.id);
      setPhase("touring");
      persistStep(step.id);
    },
    [clearPushTimer, persistStep],
  );

  const goTo = useCallback(
    (target: TourStep) => {
      if (actionInProgress.current) return;
      destroyDriver();
      skipNav.current = true; // on navigue nous-mêmes : pas de détour par la sidebar
      nav.current = emptyNavState();
      lockBlocked.current = false;
      clearPushTimer();
      setNotice(null);
      persistStep(target.id);
      setActiveId(target.id);
      const here = `${normalizeAppPath(window.location.pathname)}${window.location.search}`;
      if (here !== target.route) pushRoute(target);
    },
    [clearPushTimer, destroyDriver, persistStep, pushRoute],
  );

  const finish = useCallback(async () => {
    if (actionInProgress.current) return;
    markActionBusy(true);
    const result = await act("complete");
    markActionBusy(false);
    if (!mounted.current) return;
    if (!result.ok) { showUnavailable(); return; }
    destroyDriver();
    restoreFocus();
    setPhase("idle");
    setActiveId(null);
    showNotice({
      message: "Bravo, le tutoriel est terminé. Vous pouvez le revoir à tout moment avec « Revoir le tutoriel ».",
      tone: "info",
      autoDismiss: true,
    });
  }, [act, destroyDriver, markActionBusy, restoreFocus, showNotice, showUnavailable]);

  const skipAll = useCallback(async () => {
    if (actionInProgress.current) return;
    markActionBusy(true);
    const result = await act("skip");
    markActionBusy(false);
    if (!mounted.current) return;
    if (!result.ok) { showUnavailable(); return; }
    destroyDriver();
    restoreFocus();
    setPhase("idle");
    setActiveId(null);
    setDismissed(true);
    showNotice({
      message: "Tutoriel ignoré. Vous pouvez le relancer à tout moment avec « Revoir le tutoriel ».",
      tone: "info",
      autoDismiss: true,
    });
  }, [act, destroyDriver, markActionBusy, restoreFocus, setDismissed, showNotice, showUnavailable]);

  const pauseTour = useCallback(() => {
    if (actionInProgress.current) return;
    destroyDriver();
    restoreFocus();
    nav.current.shownOn = null; // « Reprendre » doit renaviguer vers l'étape si l'on a changé de page entre-temps
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
  }, [act, destroyDriver, restoreFocus, setDismissed, showNotice]);

  /** Navigation qui ne vient pas de l'hôte (retour navigateur, lien) : une pause, pas une erreur. Rien n'est écrit. */
  const pauseForNavigation = useCallback(
    (step: TourStep) => {
      destroyDriver();
      lastTarget.current = null;
      nav.current.shownOn = null;
      setPhase("paused");
      showNotice({
        message: NAV_LEFT_MESSAGE,
        tone: "info",
        actions: [
          {
            label: "Reprendre",
            primary: true,
            onClick: () => {
              setNotice(null);
              setPhase("touring");
              actionsRef.current?.goTo(step);
            },
          },
        ],
      });
    },
    [destroyDriver, showNotice],
  );

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
    if (!finishRestart || !requestRestart) return;
    decided.current = true;
    const list = stepsRef.current;
    if (list.length === 0) {
      finishRestart(false);
      showUnavailable();
      return;
    }
    markActionBusy(true);
    destroyDriver();
    setNotice(null);
    const result = await act("reset");
    markActionBusy(false);
    if (!mounted.current) return;
    finishRestart(result.ok);
    if (!result.ok) {
      showNotice({
        message: "La relance du tutoriel a échoué. Vous pouvez réessayer.",
        tone: "warning",
        actions: [{ label: "Réessayer", onClick: requestRestart, primary: true }],
      });
      setTick((value) => value + 1);
      return;
    }
    setDismissed(false);
    persisted.current = null;
    const [first] = stepsRef.current;
    if (first) beginTour(first);
  }, [act, beginTour, destroyDriver, finishRestart, markActionBusy, requestRestart, setDismissed, showNotice, showUnavailable]);

  const startFromDialog = useCallback(async () => {
    if (actionInProgress.current) return;
    const list = stepsRef.current;
    const current = snapRef.current;
    const kind = phaseRef.current;
    if (list.length === 0 || !current) return;
    markActionBusy(true);
    const ack: ActAck = kind === "welcome" ? await act("start") : { ok: true, snapshot: current };
    markActionBusy(false);
    if (!mounted.current) return;
    if (kind !== phaseRef.current) return;
    // 409 (déjà démarré ailleurs) : `act` a relu l'état par GET, on s'en sert au lieu d'annoncer « indisponible ».
    const outcome = startOutcome(ack);
    if (outcome === "unavailable" || !ack.snapshot) { showUnavailable(); return; }
    if (outcome === "close") { setPhase("idle"); return; }
    const first = pickStart(list, ack.snapshot, ack.snapshot.tutorial?.lastStep);
    if (first) beginTour(first);
  }, [act, beginTour, markActionBusy, showUnavailable]);

  actionsRef.current = { goTo, finish, skipAll, pauseTour, skipStep };

  useEffect(() => {
    if (isOwner && !planLoading && !actionBusy && !actionInProgress.current
      && restartStatus === "queued" && claimRestart?.()) void restart();
  }, [actionBusy, claimRestart, isOwner, planLoading, restart, restartStatus]);

  // --- Chargement initial et décision d'affichage ---------------------------------------------------------------
  useEffect(() => {
    if (!isOwner || loaded.current) return;
    loaded.current = true;
    void refreshSnapshot();
  }, [isOwner, refreshSnapshot]);

  useEffect(() => {
    if (!isOwner || phase !== "idle" || decided.current || !snap || planLoading
      || restartPending || path.startsWith("/security/")) return;
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
  }, [isOwner, phase, snap, planLoading, path, steps.length, isDismissed, restartPending]);

  // --- Événements : succès d'une action, relance, visite détaillée de l'agenda ---------------------------------
  useEffect(() => {
    if (!isOwner) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let agendaTimer: ReturnType<typeof setTimeout> | undefined;
    const onRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refreshSnapshot(), 200);
    };
    const onAgendaState = (event: Event) => {
      // Visite externe (agenda, équipe) démarrée ou terminée : c'est elle qui fait foi, pas un délai.
      const active = (event as CustomEvent<{ active?: boolean }>).detail?.active === true;
      agendaActive.current = active;
      clearTimeout(agendaTimer);
      setExternal(active);
      if (!active && lockBlocked.current) {
        // Nous attendions la fin de cette visite (verrou occupé) : on reprend sans que l'utilisatrice ait à cliquer.
        lockBlocked.current = false;
        setNotice((current) => (current?.message === LOCK_BUSY_MESSAGE ? null : current));
        setTick((value) => value + 1);
      }
    };
    const armExternalFallback = () => {
      clearTimeout(agendaTimer);
      agendaTimer = setTimeout(() => {
        const release = shouldReleaseExternal({
          externalActive: agendaActive.current,
          lockAvailable: isTourLockAvailable(LOCK_ID),
        });
        if (release) setExternal(false);
        else if (!agendaActive.current) armExternalFallback(); // verrou tenu : l'autre visite charge encore driver.js
      }, EXTERNAL_FALLBACK_MS);
    };
    const onAgendaRequest = () => {
      // Émis par notre propre bouton : on cède la place, avec un filet si l'agenda ne répond jamais.
      setExternal(true);
      armExternalFallback();
    };
    window.addEventListener(TUTORIAL_REFRESH_EVENT, onRefresh);
    window.addEventListener(AGENDA_TUTORIAL_STATE_EVENT, onAgendaState);
    window.addEventListener(AGENDA_TUTORIAL_REQUEST_EVENT, onAgendaRequest);
    return () => {
      clearTimeout(timer);
      clearTimeout(agendaTimer);
      window.removeEventListener(TUTORIAL_REFRESH_EVENT, onRefresh);
      window.removeEventListener(AGENDA_TUTORIAL_STATE_EVENT, onAgendaState);
      window.removeEventListener(AGENDA_TUTORIAL_REQUEST_EVENT, onAgendaRequest);
    };
  }, [isOwner, refreshSnapshot]);

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
      void refreshSnapshot();
    }
    wasPanelOpen.current = panelOpen;
  }, [panelOpen, phase, refreshSnapshot]);

  // L'annonce de réussite passe par une région aria-live présente en permanence : un texte inséré en même temps que
  // son conteneur (la bulle driver.js) n'est pas annoncé de façon fiable.
  useEffect(() => {
    setAnnouncement(phase === "touring" && satisfied && activeStep ? activeStep.successText : "");
  }, [phase, satisfied, activeStep]);

  // --- Affichage de l'étape active ----------------------------------------------------------------------------
  presentRef.current = async (signal: AbortSignal) => {
    const step = activeStep;
    if (!step) return;
    const index = steps.findIndex((item) => item.id === step.id);
    const desktop = isDesktopNav();
    let mode: Mode = "page";

    const decision = decideNavigation({ stepId: step.id, stepPath: step.pathname, path, nav: nav.current });
    if (decision === "on-route") {
      // Arrivée : plus rien à attendre, et c'est désormais une navigation hors de cette page qui sera une pause.
      clearPushTimer();
      nav.current.pending = null;
      nav.current.blocked = null;
      nav.current.shownOn = step.id;
    } else if (desktop && !skipNav.current) {
      mode = "nav";
      nav.current.shownOn = null;
    } else if (decision === "wait" || decision === "blocked") {
      return; // navigation en cours (on ne la relance pas, on ne compte aucun échec) ou déjà signalée
    } else if (decision === "failed") {
      clearPushTimer();
      nav.current.pending = null;
      nav.current.blocked = step.id;
      showNavFailure(step);
      return;
    } else if (decision === "left") {
      pauseForNavigation(step);
      return;
    } else {
      pushRoute(step);
      return;
    }

    const selectors = mode === "nav" ? [`[data-tour="${step.navTarget}"]`] : step.targets;
    let target: HTMLElement;
    try {
      target = await resolveTarget(selectors, mode, signal);
    } catch {
      if (signal.aborted) return;
      if (mode === "nav") {
        skipNav.current = true;
        pushRoute(step);
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
    if (!acquireTourLock(LOCK_ID)) {
      // Une autre visite (agenda, équipe) tient le verrou : on le dit, on réessaie à sa fin ou sur demande.
      lockBlocked.current = true;
      showNotice({
        message: LOCK_BUSY_MESSAGE,
        tone: "warning",
        actions: [
          {
            label: "Réessayer",
            primary: true,
            onClick: () => {
              lockBlocked.current = false;
              setNotice(null);
              setTick((value) => value + 1);
            },
          },
        ],
      });
      return;
    }
    lockBlocked.current = false;
    setNotice((current) => (current?.tone === "warning" ? null : current));
    lastTarget.current = target;

    const last = index === steps.length - 1;
    // Texte de repli quand seule une cible secondaire est visible (ex. aucune employée : pas de bouton d'horaires).
    const usingFallback = mode === "page" && !!step.fallbackDescription && !target.matches(step.targets[0]);
    const title = mode === "nav" ? `Ouvrez « ${step.navLabel} »` : step.title;
    const description =
      mode === "nav" ? step.navDescription : usingFallback ? (step.fallbackDescription ?? step.description) : step.description;
    const nextText = mode === "nav" ? `Ouvrir ${step.navLabel}` : last ? "Terminer" : satisfied ? "Étape suivante" : "Suivant";
    const actions = () => actionsRef.current;

    const advance = () => {
      if (mode === "nav") {
        destroyDriver();
        skipNav.current = true;
        pushRoute(step);
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
            // Réévaluée à chaque affichage : la cible capturée plus haut peut avoir été remplacée par React entre-temps.
            element: () => findVisibleTarget(selectors, mode === "page") ?? target,
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
    if (phase !== "touring" || !activeId || panelOpen || external || restartPending) return;
    const abort = new AbortController();
    void presentRef.current(abort.signal).catch(() => {
      /* annulation ou échec de chargement : aucun blocage */
    });
    return () => {
      abort.abort();
      destroyDriver();
    };
  }, [phase, activeId, path, panelOpen, external, satisfied, tick, steps, destroyDriver, restartPending]);

  // Annonce de fin / pause : disparition automatique.
  useEffect(() => {
    if (!notice?.autoDismiss) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!isOwner) return null;

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-rb-tutorial>
        {announcement}
      </div>
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

/**
 * Cible de l'étape. Quand une étape a une cible principale et un repli (ex. bouton « Modifier les horaires » sinon
 * onglet Planning), on laisse d'abord un court délai à la principale : après un changement d'onglet, le repli est
 * déjà visible alors que la principale n'est pas encore montée.
 */
async function resolveTarget(selectors: readonly string[], mode: Mode, signal: AbortSignal): Promise<HTMLElement> {
  if (mode === "page" && selectors.length > 1) {
    const grace = new AbortController();
    const forward = () => grace.abort();
    signal.addEventListener("abort", forward, { once: true });
    const timer = setTimeout(forward, PRIMARY_TARGET_GRACE_MS);
    try {
      return await waitForVisibleTarget([selectors[0]], grace.signal, true);
    } catch {
      if (signal.aborted) throw new DOMException("Annulé", "AbortError");
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", forward);
    }
  }
  return waitForVisibleTarget(selectors, signal, mode === "page");
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
