import { TUTORIAL_REFRESH_EVENT } from "@/lib/tutorial-events";

export { TUTORIAL_REFRESH_EVENT };

/** Relance le tutoriel depuis le début (reset côté serveur). Écouté par TutorialHost. */
export const TUTORIAL_RESTART_EVENT = "rb:tutorial-restart";
/** Demande à l'agenda de lancer sa visite détaillée (étape « agenda » du parcours). */
export const AGENDA_TUTORIAL_REQUEST_EVENT = "rb:agenda-tutorial-request";
/** Émis par l'agenda quand sa visite détaillée démarre (detail.active = true) ou se termine (false). */
export const AGENDA_TUTORIAL_STATE_EVENT = "rb:agenda-tutorial-state";

export function tutorialDeferralKey(userId: string): string {
  return `rb:tutorial-later:${userId}`;
}

/** Une déconnexion termine le report du tutoriel, même dans le même onglet. */
export function clearTutorialDeferral(userId: string): void {
  try {
    sessionStorage.removeItem(tutorialDeferralKey(userId));
  } catch {
    // Le stockage peut être désactivé dans le navigateur.
  }
}

export function restartTutorial(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TUTORIAL_RESTART_EVENT));
}
