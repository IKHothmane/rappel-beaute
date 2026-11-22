export const TUTORIAL_REFRESH_EVENT = "rb:tutorial-refresh";

/** Prévient le tutoriel de première connexion qu'une action utile vient de réussir. */
export function notifyTutorialRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TUTORIAL_REFRESH_EVENT));
}
