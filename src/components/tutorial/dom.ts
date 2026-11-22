/** Utilitaires DOM partagés par le parcours de première connexion et la visite de l'agenda. */

export const TARGET_TIMEOUT_MS = 6000;

export class TargetUnavailableError extends Error {
  constructor() {
    super("Zone du tutoriel indisponible.");
    this.name = "TargetUnavailableError";
  }
}

/** html { zoom: 0.8 } : facteur appliqué à la racine (1 si aucun). */
export function rootZoom(): number {
  if (typeof document === "undefined") return 1;
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

/** Applique la compensation du zoom au popover driver.js (variable lue par tutorial.css). Renvoie la fonction de restauration. */
export function applyInverseZoom(): () => void {
  const previous = document.body.style.getPropertyValue("--agenda-tour-inverse-zoom");
  document.body.style.setProperty("--agenda-tour-inverse-zoom", String(1 / rootZoom()));
  return () => {
    if (previous) document.body.style.setProperty("--agenda-tour-inverse-zoom", previous);
    else document.body.style.removeProperty("--agenda-tour-inverse-zoom");
  };
}

/** Vrai à partir de lg (1024px) : la sidebar est alors toujours visible. */
export function isDesktopNav(): boolean {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function isRendered(element: HTMLElement): boolean {
  if (element.getClientRects().length === 0) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none";
}

/** Le tiroir mobile fermé est rendu mais translaté hors de l'écran. */
export function isVisibleInViewport(element: HTMLElement): boolean {
  if (!isRendered(element)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return (
    rect.right > 1 &&
    rect.bottom > 1 &&
    rect.left < window.innerWidth - 1 &&
    rect.top < window.innerHeight - 1
  );
}

/** Premier élément visible parmi les sélecteurs (dans l'ordre des sélecteurs). */
export function findVisibleTarget(selectors: readonly string[], canScroll = false): HTMLElement | undefined {
  for (const selector of selectors) {
    const found = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
      canScroll ? isRendered : isVisibleInViewport,
    );
    if (found) return found;
  }
  return undefined;
}

/**
 * Attend que la cible soit visible et que sa position soit stable (animation de panneau, mise en page), puis la
 * recentre. Rejette avec TargetUnavailableError après `timeoutMs`, ou avec une erreur d'annulation si `signal` est annulé.
 */
export function waitForVisibleTarget(
  selectors: readonly string[],
  signal: AbortSignal,
  canScroll = false,
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    let previous = "";
    let stable = 0;
    let scrolled: HTMLElement | undefined;
    const frame = () => {
      if (signal.aborted) {
        reject(new DOMException("Annulé", "AbortError"));
        return;
      }
      const element = findVisibleTarget(selectors, canScroll);
      if (element) {
        if (scrolled !== element) {
          element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" as ScrollBehavior });
          scrolled = element;
        }
        const rect = element.getBoundingClientRect();
        const bounds = [rect.x, rect.y, rect.width, rect.height].map(Math.round).join(",");
        stable = bounds === previous ? stable + 1 : 0;
        previous = bounds;
        if (stable >= 6 && isVisibleInViewport(element)) {
          resolve(element);
          return;
        }
      } else {
        stable = 0;
        scrolled = undefined;
      }
      if (performance.now() - started > TARGET_TIMEOUT_MS) {
        reject(new TargetUnavailableError());
        return;
      }
      requestAnimationFrame(frame);
    };
    frame();
  });
}

/** Normalise un pathname Next (préfixe /domains/app, slash final) pour le comparer à TourStep.pathname. */
export function normalizeAppPath(pathname: string): string {
  const stripped = pathname.replace(/^\/domains\/app/, "") || "/";
  return stripped.endsWith("/") ? stripped : `${stripped}/`;
}

/** Une boîte de dialogue modale (panneau latéral, tiroir) recouvre la page, hors tutoriel lui-même. */
export function isModalOpen(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal]')).some(
    (node) => !node.closest(".driver-popover") && !node.closest("[data-rb-tutorial]") && node.getClientRects().length > 0,
  );
}
