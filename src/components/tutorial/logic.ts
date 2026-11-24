import type { TutorialSnapshot } from "./api";

/**
 * Règles de décision du parcours de première connexion, sans React ni DOM : le composant ne fait qu'appliquer ces
 * décisions. Elles sont testées en Vitest (le projet n'embarque pas jsdom).
 */

// --- Navigation de l'hôte ------------------------------------------------------------------------------------------

/** Navigation demandée par l'hôte vers la page d'une étape, et pas encore arrivée. */
export type PendingPush = { stepId: string; from: string };

export type NavState = {
  /** Poussée router.push en cours (uniquement quand le pathname doit changer). */
  pending: PendingPush | null;
  /** Étape dont la page n'a pas pu s'afficher : on n'insiste pas tant que l'utilisatrice n'a pas choisi « Réessayer ». */
  blocked: string | null;
  /** Étape actuellement affichée sur sa page (sert à reconnaître une navigation qui ne vient pas de l'hôte). */
  shownOn: string | null;
};

export const emptyNavState = (): NavState => ({ pending: null, blocked: null, shownOn: null });

export type NavDecision =
  /** On est sur la page de l'étape. */
  | "on-route"
  /** Notre navigation est en cours : on attend l'arrivée sans la relancer ni compter d'échec. */
  | "wait"
  /** Rien n'est en cours et on n'y est pas : l'hôte navigue lui-même. */
  | "push"
  /** Notre navigation a abouti ailleurs (redirection) : la page n'a pas pu s'afficher. */
  | "failed"
  /** L'utilisatrice a quitté la page (retour navigateur, lien) : pause, pas une erreur. */
  | "left"
  /** Déjà signalé : on attend « Réessayer » ou « Passer cette étape ». */
  | "blocked";

export function decideNavigation(input: { stepId: string; stepPath: string; path: string; nav: NavState }): NavDecision {
  const { stepId, stepPath, path, nav } = input;
  if (path === stepPath) return "on-route";
  if (nav.blocked === stepId) return "blocked";
  if (nav.pending && nav.pending.stepId === stepId) return path === nav.pending.from ? "wait" : "failed";
  if (nav.shownOn === stepId) return "left";
  return "push";
}

/**
 * Une poussée n'est suivie que si le pathname change : quand seule la query change (équipe -> planning), l'étape est
 * déjà « sur sa page » et il n'y a rien à attendre (un suivi resterait périmé).
 */
export function trackPush(stepId: string, fromPath: string, stepPath: string): PendingPush | null {
  return fromPath === stepPath ? null : { stepId, from: fromPath };
}

export const NAV_FAILED_MESSAGE = "La page n’a pas pu s’afficher. Vous pouvez réessayer ou passer cette étape.";
export const NAV_LEFT_MESSAGE = "Vous avez quitté la page du tutoriel. Reprenez quand vous voulez, là où vous vous étiez arrêtée.";
export const LOCK_BUSY_MESSAGE =
  "Une autre visite guidée est en cours. Le tutoriel reprendra dès qu’elle sera terminée, ou cliquez sur « Réessayer ».";

// --- Visite externe (agenda, équipe) -------------------------------------------------------------------------------

/**
 * Filet de sécurité après une demande de visite externe : l'hôte ne reprend la main que si la visite n'est pas
 * active ET si le verrou est libre. Un verrou tenu signifie que l'autre visite démarre (chargement de driver.js
 * lent) : reprendre la main maintenant provoquerait une course pour le verrou.
 */
export function shouldReleaseExternal(state: { externalActive: boolean; lockAvailable: boolean }): boolean {
  return !state.externalActive && state.lockAvailable;
}

// --- Démarrage depuis la carte -------------------------------------------------------------------------------------

export type ActAck = { ok: boolean; snapshot: TutorialSnapshot | null };
export type StartOutcome = "begin" | "close" | "unavailable";

/**
 * Résultat de « Commencer » / « Reprendre ». `ok` = l'écriture a abouti. Après un échec (409 : déjà démarré dans un
 * autre onglet), `snapshot` est l'état relu par GET : on s'en sert au lieu d'annoncer « indisponible ». Seul un GET
 * en échec (snapshot nul) est une vraie indisponibilité.
 */
export function startOutcome(ack: ActAck): StartOutcome {
  if (!ack.snapshot) return "unavailable";
  if (ack.ok) return "begin";
  const status = ack.snapshot.tutorial?.status;
  if (status === "IN_PROGRESS") return "begin";
  if (status === "COMPLETED" || status === "SKIPPED") return "close";
  return "unavailable";
}

// --- Page de configuration -----------------------------------------------------------------------------------------

export type OnboardingAccess = "loading" | "owner" | "denied";

/**
 * Seul le propriétaire a une progression : le GET renvoie une progression vide pour tout autre rôle, ce qui
 * s'afficherait comme un faux « 0 % ». La page est donc réservée.
 */
export function onboardingAccess(input: { loading: boolean; role: string | null }): OnboardingAccess {
  if (input.loading) return "loading";
  return input.role === "OWNER" ? "owner" : "denied";
}
