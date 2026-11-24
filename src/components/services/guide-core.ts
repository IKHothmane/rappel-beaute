/**
 * Logique pure des visites guidées des pages Services et Ressources (sans React, sans DOM, sans driver.js) :
 * sélection des étapes selon les droits, les zones réellement présentes et les formulaires disponibles.
 * Testée en Vitest (tests/tutorial/page-guides.test.ts).
 */

export type GuideStep = {
  id: string;
  /** Valeur de l'attribut data-*-tour de la zone à mettre en avant (jamais un nœud capturé : on le retrouve à chaque étape). */
  target: string;
  title: string;
  description: string;
  /** Texte alternatif sur mobile et tablette (< 1024 px), quand la zone se présente autrement. */
  mobileDescription?: string;
  /** Texte alternatif quand l'utilisatrice ne peut pas écrire. */
  readOnlyDescription?: string;
  /** Texte alternatif quand le champ existe mais n'est pas modifiable (rôle sans droit sur le tarif). */
  lockedDescription?: string;
  /** Introduction : non numérotée. */
  intro?: boolean;
  /** Formulaire ou panneau gardé ouvert (en démonstration) pendant cette étape. */
  demo?: string;
  /** Le bouton « Suivant » ouvre le formulaire de démonstration. */
  opens?: boolean;
  /** Étape de création ou de modification : masquée sans droit d'écriture. */
  write?: boolean;
  /** Étape de formulaire : proposée seulement si l'étape qui l'ouvre l'est. */
  from?: string;
  /** Indicateur (GuideContext.flags) qui doit être vrai pour que l'étape soit proposée. */
  needs?: string;
};

export type GuideContext = {
  canWrite: boolean;
  /** Conditions calculées au démarrage (formulaire disponible, prestations à associer…). */
  flags: Readonly<Record<string, boolean>>;
  /** La zone existe et est affichée (liste vide, mise en page mobile ou large…). */
  isPresent: (target: string) => boolean;
};

export type ResolvedStep = GuideStep & { index: number; number: number | null; opener: boolean };

/** Étapes réellement proposées, dans l'ordre : jamais d'étape qui exige un élément absent ou un droit manquant. */
export function resolveGuideSteps(steps: readonly GuideStep[], ctx: GuideContext): ResolvedStep[] {
  const included = new Set<string>();
  const kept: GuideStep[] = [];
  for (const step of steps) {
    if (step.write && !ctx.canWrite) continue;
    if (step.needs && !ctx.flags[step.needs]) continue;
    if (step.from ? !included.has(step.from) : !ctx.isPresent(step.target)) continue;
    included.add(step.id);
    kept.push(step);
  }
  let counter = 0;
  return kept.map((step, index) => ({
    ...step,
    index,
    number: step.intro ? null : ++counter,
    opener: Boolean(step.opens) && ctx.canWrite,
  }));
}

/** Texte affiché pour une étape selon les droits, le champ verrouillé et la mise en page. */
export function describeGuideStep(
  step: GuideStep,
  view: { canWrite: boolean; wide: boolean; locked?: boolean },
): string {
  if (!view.canWrite && step.readOnlyDescription) return step.readOnlyDescription;
  if (view.locked && step.lockedDescription) return step.lockedDescription;
  if (!view.wide && step.mobileDescription) return step.mobileDescription;
  return step.description;
}

/** Palier de largeur : la visite se referme si l'écran change de mise en page (mobile, tablette, large, très large). */
export function widthBucketOf(width: number): number {
  return width < 768 ? 0 : width < 1024 ? 1 : width < 1280 ? 2 : 3;
}

/** Bouton de l'étape : « Terminer » à la fin, « Voir le formulaire » quand elle ouvre un formulaire, sinon « Suivant ». */
export function nextButtonLabel(step: Pick<ResolvedStep, "index" | "opener">, lastIndex: number): string {
  return step.index === lastIndex ? "Terminer" : step.opener ? "Voir le formulaire" : "Suivant";
}

/**
 * Attend qu'une condition devienne vraie (données secondaires chargées…) sans jamais bloquer la visite :
 * renvoie vrai dès qu'elle l'est, faux à l'expiration du délai, et rejette avec AbortError si la visite est annulée.
 */
export function waitUntilReady(
  isReady: () => boolean,
  signal: AbortSignal,
  timeoutMs: number,
  intervalMs = 100,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (signal.aborted) {
        reject(new DOMException("Annulé", "AbortError"));
        return;
      }
      if (isReady()) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, intervalMs);
    };
    check();
  });
}

export type GuideSessionDeps = {
  /** Prend le verrou des visites (faux si une autre visite est en cours). */
  acquire: () => boolean;
  release: () => void;
  /** Ouvre (valeur) ou ferme (null) le formulaire de démonstration de la page. */
  onDemoChange: (demo: string | null) => void;
  /** Indicateur « visite active » exposé à la page : toute écriture et tout tiroir réel sont refusés tant qu'il est vrai. */
  onActiveChange?: (active: boolean) => void;
  /** Événement d'état de la visite (le parcours de première connexion et l'agenda l'écoutent). */
  announce: (active: boolean) => void;
};

/**
 * Cycle de vie d'une visite (sans React ni DOM) : l'indicateur « visite active » est posé dès la prise du verrou, donc
 * avant le chargement et pendant toute la visite, et n'est retiré qu'après la fermeture du formulaire de démonstration,
 * la libération du verrou et l'événement active:false. `end` est idempotent.
 */
export function createGuideSession(deps: GuideSessionDeps) {
  let active = false;
  let demo: string | null = null;
  return {
    get active() {
      return active;
    },
    get demo() {
      return demo;
    },
    begin(): boolean {
      if (active || !deps.acquire()) return false;
      active = true;
      deps.onActiveChange?.(true);
      return true;
    },
    /** La visite démarre : prévient les autres parcours (active:true). */
    announceStart() {
      if (active) deps.announce(true);
    },
    setDemo(next: string | null) {
      if (!active || demo === next) return;
      demo = next;
      deps.onDemoChange(next);
    },
    /** Fin de visite, quelle qu'en soit la cause (terminée, fermée, erreur, annulée, page quittée). */
    end() {
      if (!active) return;
      active = false;
      demo = null;
      deps.onDemoChange(null);
      deps.release();
      deps.announce(false);
      deps.onActiveChange?.(false);
    },
  };
}

export type GuideSession = ReturnType<typeof createGuideSession>;
