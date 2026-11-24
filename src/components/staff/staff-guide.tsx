"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import type { Driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/components/tutorial/tutorial.css";
import {
  applyInverseZoom,
  findVisibleTarget,
  TargetUnavailableError,
  waitForVisibleTarget,
} from "@/components/tutorial/dom";
import { AGENDA_TUTORIAL_STATE_EVENT } from "@/components/tutorial/events";
import { acquireTourLock, releaseTourLock } from "@/components/tutorial/lock";

export type StaffGuideTab = "staff" | "planning";
/** Formulaire ou panneau ouvert en mode démonstration pendant la visite (aucune écriture). */
export type TourDemo = "staff-form" | "schedule" | "hours" | "leave" | "overtime" | "replacement";

type GuideStep = {
  id: string;
  tab: StaffGuideTab;
  /** Valeur de l'attribut data-staff-tour de la zone à mettre en avant. */
  target: string;
  title: string;
  description: string;
  /** Texte alternatif quand l'utilisateur ne peut pas écrire (pas de formulaire proposé). */
  readOnlyDescription?: string;
  /** Introduction : non numérotée. */
  intro?: boolean;
  /** Panneau ou formulaire gardé ouvert (en démonstration) pendant cette étape. */
  demo?: TourDemo;
  /** Le bouton « Suivant » ouvre un formulaire de démonstration (seulement si l'utilisateur peut écrire). */
  opens?: boolean;
  /** Étape de création ou de modification : masquée si l'utilisateur ne peut pas écrire. */
  write?: boolean;
  /** Étape de formulaire : proposée seulement si l'étape qui l'ouvre l'est. */
  from?: string;
};

const LOCK_ID = "staff-guide";
const SELECTOR_ATTR = "data-staff-tour";

const STEPS: readonly GuideStep[] = [
  // --- Onglet Équipe ------------------------------------------------------------------------------------------
  {
    id: "team-intro", tab: "staff", target: "team-intro", intro: true,
    title: "Découvrir votre équipe",
    description: "Nous allons parcourir l’onglet Équipe, puis ouvrir le formulaire pour vous montrer comment ajouter une collaboratrice. Aucun profil ne sera enregistré pendant cette démonstration.",
    readOnlyDescription: "Nous allons parcourir l’onglet Équipe : profils, performances, recherche et filtres. Cette visite ne modifie aucune donnée.",
  },
  {
    id: "team-metrics", tab: "staff", target: "team-metrics",
    title: "Suivre l’équipe en un coup d’œil",
    description: "Ces indicateurs résument l’effectif (actives, en congé), les soins honorés, le chiffre d’affaires attribué aux praticiennes et la satisfaction. Certains montants peuvent être masqués selon vos droits.",
  },
  {
    id: "team-search", tab: "staff", target: "team-search",
    title: "Rechercher une collaboratrice",
    description: "Saisissez un nom, un poste, un numéro de téléphone ou un service pour retrouver une personne. Le raccourci Ctrl+K (⌘+K sur Mac) place le curseur dans cette zone.",
  },
  {
    id: "team-status", tab: "staff", target: "team-status",
    title: "Filtrer par statut",
    description: "Affichez toute l’équipe, seulement les collaboratrices actives, celles en congé, ou les meilleures vendeuses. Ces filtres restent inchangés pendant la visite.",
  },
  {
    id: "team-poste", tab: "staff", target: "team-poste",
    title: "Filtrer par poste",
    description: "Le bouton Filtres ouvre la liste des postes (esthéticienne, coiffeuse…) pour n’afficher qu’une fonction de l’équipe.",
  },
  {
    id: "team-list", tab: "staff", target: "team-list",
    title: "Parcourir la liste",
    description: "Chaque carte présente une collaboratrice : statut, poste, téléphone, rendez-vous, chiffre d’affaires généré, score et services réalisés. Cliquez sur une carte pour afficher sa fiche.",
  },
  {
    id: "team-actions", tab: "staff", target: "team-actions",
    title: "Ouvrir une fiche",
    description: "Dans la fiche, Planning ouvre ses horaires, Modifier rouvre le formulaire pré-rempli (réservé aux profils autorisés) et WhatsApp lance une conversation si un numéro est renseigné. Aucune fiche n’est modifiée pendant cette visite.",
  },
  {
    id: "team-contact", tab: "staff", target: "team-contact",
    title: "Contact et identité",
    description: "Retrouvez l’e-mail, le téléphone, la date d’arrivée et le statut de la personne, ainsi que sa rémunération si votre rôle l’autorise.",
  },
  {
    id: "team-skills", tab: "staff", target: "team-skills",
    title: "Prestations autorisées",
    description: "Les habilitations listent les services que cette personne peut réaliser. Elles servent à lui affecter les rendez-vous correspondants.",
  },
  {
    id: "team-perf", tab: "staff", target: "team-perf",
    title: "Mesurer la performance",
    description: "Rendez-vous, chiffre d’affaires et satisfaction de la personne, calculés sur la période récente lorsque des données sont disponibles.",
  },
  {
    id: "team-add", tab: "staff", target: "team-add", write: true, opens: true,
    title: "Ajouter une collaboratrice",
    description: "Ce bouton ouvre le formulaire d’ajout. Cliquez sur Voir le formulaire pour le découvrir en mode démonstration.",
  },
  {
    id: "form-identity", tab: "staff", target: "form-identity", write: true, from: "team-add", demo: "staff-form",
    title: "Prénom et nom",
    description: "Le prénom est obligatoire ; le nom est facultatif. Ils apparaissent dans l’agenda, le planning et les rendez-vous.",
  },
  {
    id: "form-phone", tab: "staff", target: "form-phone", write: true, from: "team-add", demo: "staff-form",
    title: "Téléphone",
    description: "Facultatif. Saisissez un numéro de 10 chiffres : il permet de contacter la personne, notamment par WhatsApp depuis sa fiche.",
  },
  {
    id: "form-email", tab: "staff", target: "form-email", write: true, from: "team-add", demo: "staff-form",
    title: "E-mail",
    description: "Facultatif. L’adresse s’affiche dans la fiche de la collaboratrice.",
  },
  {
    id: "form-position", tab: "staff", target: "form-position", write: true, from: "team-add", demo: "staff-form",
    title: "Poste",
    description: "Indiquez sa fonction (par exemple Esthéticienne). Elle s’affiche sur sa fiche et alimente le filtre par poste.",
  },
  {
    id: "form-status", tab: "staff", target: "form-status", write: true, from: "team-add", demo: "staff-form",
    title: "Statut",
    description: "Choisissez Actif, Inactif, En congé ou Archivé. Une nouvelle collaboratrice est active par défaut.",
  },
  {
    id: "form-hire", tab: "staff", target: "form-hire", write: true, from: "team-add", demo: "staff-form",
    title: "Date d’embauche",
    description: "Facultatif. Saisissez la date au format JJ/MM/AAAA. Une date incomplète ou invalide bloque l’enregistrement.",
  },
  {
    id: "form-services", tab: "staff", target: "form-services", write: true, from: "team-add", demo: "staff-form",
    title: "Prestations réalisées",
    description: "Cochez les services que la personne peut réaliser. Ils viennent de votre catalogue de prestations ; vous pourrez les modifier plus tard.",
  },
  {
    id: "form-save", tab: "staff", target: "form-save", write: true, from: "team-add", demo: "staff-form",
    title: "Enregistrer le profil",
    description: "En utilisation normale, cliquez sur Créer la collaboratrice après avoir vérifié le prénom et les champs renseignés. Le bouton est désactivé ici : Terminer fermera simplement la démonstration.",
  },

  // --- Onglet Planning ----------------------------------------------------------------------------------------
  {
    id: "pl-intro", tab: "planning", target: "team-intro", intro: true,
    title: "Découvrir votre planning",
    description: "Nous allons parcourir le planning, puis ouvrir les panneaux de modification pour vous montrer comment saisir horaires, absences et remplacements. Aucune donnée ne sera enregistrée pendant cette démonstration.",
    readOnlyDescription: "Nous allons parcourir le planning : navigation, filtres, horaires, absences et remplacements. Cette visite ne modifie aucune donnée.",
  },
  {
    id: "pl-kpis", tab: "planning", target: "pl-kpis",
    title: "Les indicateurs de la semaine",
    description: "Équipe active, heures planifiées, rendez-vous synchronisés avec l’agenda et taux de disponibilité : ces chiffres suivent la période affichée.",
  },
  {
    id: "pl-nav", tab: "planning", target: "pl-nav",
    title: "Changer de période",
    description: "Les flèches avancent ou reculent d’un jour, d’une semaine ou d’un mois selon la vue. Le bouton central revient à la période en cours.",
  },
  {
    id: "pl-views", tab: "planning", target: "pl-views",
    title: "Choisir la vue",
    description: "Jour, Semaine ou Mois : choisissez le niveau de détail. La vue Mois résume congés, heures supplémentaires et fermetures.",
  },
  {
    id: "pl-filter", tab: "planning", target: "pl-filter",
    title: "Filtrer par membre de l’équipe",
    description: "Affichez le planning de toute l’équipe ou d’une seule employée. Vous pouvez aussi cliquer sur son nom dans le tableau pour la sélectionner. Le filtre reste inchangé pendant la visite.",
  },
  {
    id: "pl-calendar", tab: "planning", target: "pl-calendar",
    title: "Lire le planning",
    description: "Chaque ligne ou case montre les horaires, les repos, les congés, les heures supplémentaires et les remplacements. Les chevauchements avec des rendez-vous sont signalés sous le tableau.",
  },
  {
    id: "pl-week", tab: "planning", target: "pl-week",
    title: "Le planning d’une employée",
    description: "Ce panneau détaille la semaine de l’employée sélectionnée. Cliquez sur un jour pour ouvrir le panneau de modification de ses horaires.",
  },
  {
    id: "pl-edit", tab: "planning", target: "pl-edit", write: true, opens: true,
    title: "Modifier les horaires",
    description: "Ce bouton ouvre le panneau « Modifier le planning ». Cliquez sur Voir le formulaire pour le découvrir en mode démonstration.",
  },
  {
    id: "sch-days", tab: "planning", target: "sch-days", write: true, from: "pl-edit", demo: "schedule",
    title: "Jours et horaires de travail",
    description: "Cochez les jours travaillés ; un jour décoché passe en Repos. Pour chaque jour travaillé, indiquez l’heure de début et l’heure de fin. Les pauses déjà enregistrées sont conservées.",
  },
  {
    id: "sch-save", tab: "planning", target: "sch-save", write: true, from: "pl-edit", demo: "schedule",
    title: "Enregistrer le planning",
    description: "En utilisation normale, Enregistrer applique les nouveaux horaires (l’heure de fin doit suivre l’heure de début) et l’agenda en tient compte. Le bouton est désactivé ici : Suivant ferme simplement ce panneau.",
  },
  {
    id: "pl-leaves", tab: "planning", target: "pl-leaves", write: true, opens: true,
    title: "Congés et absences",
    description: "Cette section liste les absences à venir de l’employée sélectionnée. Le bouton + Ajouter ouvre le formulaire : Voir le formulaire le présente en démonstration.",
  },
  {
    id: "lv-staff", tab: "planning", target: "lv-staff", write: true, from: "pl-leaves", demo: "leave",
    title: "Choisir l’employée",
    description: "Sélectionnez la personne absente. Elle est pré-remplie avec l’employée sélectionnée dans le planning.",
  },
  {
    id: "lv-dates", tab: "planning", target: "lv-dates", write: true, from: "pl-leaves", demo: "leave",
    title: "Indiquer la période",
    description: "Saisissez la date de début et la date de fin de l’absence, ou choisissez-les dans le calendrier.",
  },
  {
    id: "lv-type", tab: "planning", target: "lv-type", write: true, from: "pl-leaves", demo: "leave",
    title: "Type et motif",
    description: "Choisissez le type d’absence, puis précisez éventuellement un motif (champ facultatif).",
  },
  {
    id: "lv-save", tab: "planning", target: "lv-save", write: true, from: "pl-leaves", demo: "leave",
    title: "Enregistrer l’absence",
    description: "En utilisation normale, Enregistrer bloque les créneaux de l’agenda pendant l’absence ; le bouton reste inactif tant que l’employée et les deux dates ne sont pas renseignées. Il est désactivé ici.",
  },
  {
    id: "pl-extra", tab: "planning", target: "pl-extra", write: true, opens: true,
    title: "Heures supplémentaires et remplacements",
    description: "+ HS ajoute une plage hors planning habituel ; + Remplacement indique qui remplace qui, et quand. Voir le formulaire ouvre d’abord les heures supplémentaires.",
  },
  {
    id: "ot-staff", tab: "planning", target: "ot-staff", write: true, from: "pl-extra", demo: "overtime",
    title: "Heures supplémentaires : l’employée",
    description: "Choisissez l’employée qui travaillera en dehors de son planning habituel.",
  },
  {
    id: "ot-dates", tab: "planning", target: "ot-dates", write: true, from: "pl-extra", demo: "overtime",
    title: "Heures supplémentaires : plage et motif",
    description: "Indiquez le début et la fin de la plage (date et heure), puis le motif, par exemple une forte affluence.",
  },
  {
    id: "ot-save", tab: "planning", target: "ot-save", write: true, from: "pl-extra", demo: "overtime",
    title: "Ajouter les heures supplémentaires",
    description: "En utilisation normale, Ajouter enregistre la plage, qui devient disponible dans l’agenda. Le bouton est désactivé ici. Suivant présente le formulaire de remplacement.",
  },
  {
    id: "rp-people", tab: "planning", target: "rp-people", write: true, from: "pl-extra", demo: "replacement",
    title: "Remplacement : absente et remplaçante",
    description: "Choisissez l’employée absente, puis celle qui la remplace. La remplaçante doit être une autre personne que l’absente.",
  },
  {
    id: "rp-dates", tab: "planning", target: "rp-dates", write: true, from: "pl-extra", demo: "replacement",
    title: "Remplacement : plage et motif",
    description: "Indiquez le début et la fin du remplacement (date et heure), puis le motif, par exemple un congé.",
  },
  {
    id: "rp-save", tab: "planning", target: "rp-save", write: true, from: "pl-extra", demo: "replacement",
    title: "Enregistrer le remplacement",
    description: "En utilisation normale, Ajouter enregistre le remplacement, qui apparaît dans le planning des deux employées. Le bouton est désactivé ici.",
  },
  {
    id: "pl-opening", tab: "planning", target: "pl-opening", opens: true,
    title: "Horaires d’ouverture du salon",
    description: "Ces horaires sont dérivés de ceux de l’équipe. Modifier ouvre le panneau d’ouverture ; Voir le formulaire le présente en démonstration.",
    readOnlyDescription: "Consultez ici les horaires d’ouverture du salon, dérivés de ceux de l’équipe. Pour les modifier, rapprochez-vous d’un profil autorisé.",
  },
  {
    id: "oh-days", tab: "planning", target: "oh-days", write: true, from: "pl-opening", demo: "hours",
    title: "Jours et heures d’ouverture",
    description: "Cochez les jours d’ouverture et indiquez l’ouverture et la fermeture. Ces horaires s’appliquent à toutes les employées actives.",
  },
  {
    id: "oh-save", tab: "planning", target: "oh-save", write: true, from: "pl-opening", demo: "hours",
    title: "Enregistrer les horaires d’ouverture",
    description: "En utilisation normale, Enregistrer met à jour les horaires de toutes les employées actives : vérifiez-les avant de valider. Le bouton est désactivé ici.",
  },
  {
    id: "pl-history", tab: "planning", target: "pl-history",
    title: "Historique",
    description: "Retrouvez ici les congés, absences, heures supplémentaires et remplacements, y compris les périodes passées. Utilisez la liste pour n’afficher qu’une employée.",
  },
];

function selectorFor(target: string) {
  return `[${SELECTOR_ATTR}="${target}"]`;
}

function widthBucket(): number {
  const width = window.innerWidth;
  return width < 768 ? 0 : width < 1024 ? 1 : width < 1280 ? 2 : 3;
}

/** Attend qu'un élément du DOM existe (page chargée) ; rejette à l'expiration ou à l'annulation. */
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

type ResolvedStep = GuideStep & { index: number; number: number | null; opener: boolean };

/** Étapes réellement proposées : droits d'écriture, zones présentes (employée sélectionnée…), formulaires rattachés. */
function resolveSteps(tab: StaffGuideTab, canWrite: boolean, isPresent: (selector: string) => boolean): ResolvedStep[] {
  const included = new Set<string>();
  const kept: GuideStep[] = [];
  for (const step of STEPS) {
    if (step.tab !== tab) continue;
    if (step.write && !canWrite) continue;
    if (step.from ? !included.has(step.from) : !isPresent(selectorFor(step.target))) continue;
    included.add(step.id);
    kept.push(step);
  }
  let counter = 0;
  return kept.map((step, index) => ({
    ...step,
    index,
    number: step.intro ? null : ++counter,
    opener: Boolean(step.opens) && canWrite,
  }));
}

export function StaffGuide({
  tab,
  onTabChange,
  canStaff,
  canPlanning,
  canWriteStaff,
  onDemoChange,
}: {
  tab: StaffGuideTab;
  onTabChange: (tab: StaffGuideTab) => void;
  canStaff: boolean;
  canPlanning: boolean;
  canWriteStaff: boolean;
  /** Ouvre (valeur) ou ferme (null) le formulaire de démonstration correspondant. */
  onDemoChange: (demo: TourDemo | null) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tourRef = useRef<Driver | null>(null);
  const runRef = useRef<AbortController | null>(null);
  const callbacks = useRef({ tab, onTabChange, onDemoChange });
  callbacks.current = { tab, onTabChange, onDemoChange };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    runRef.current?.abort();
    if (tourRef.current) {
      tourRef.current.destroy();
    } else if (runRef.current) {
      runRef.current = null;
      releaseTourLock(LOCK_ID);
    }
  }, []);

  async function start() {
    if (runRef.current) return;
    // L'onglet courant détermine la visite ; on bascule seulement si l'utilisateur n'a pas accès à cet onglet.
    const startTab: StaffGuideTab =
      callbacks.current.tab === "planning"
        ? canPlanning ? "planning" : "staff"
        : canStaff ? "staff" : "planning";
    if (startTab === "staff" ? !canStaff : !canPlanning) return;
    if (!acquireTourLock(LOCK_ID)) {
      setError("Fermez le tutoriel en cours avant d’ouvrir cette visite.");
      return;
    }

    const run = new AbortController();
    runRef.current = run;
    setLoading(true);
    setError(null);
    let restoreZoom: (() => void) | undefined;
    let steps: ResolvedStep[] = [];
    let moving = false;
    let demo: TourDemo | null = null;
    const bucket = widthBucket();
    // Les mises en page mobile, tablette et large n'affichent pas les mêmes zones : on referme la visite si elle bascule.
    const onResize = () => {
      if (widthBucket() !== bucket) tourRef.current?.destroy();
    };

    function setDemo(next: TourDemo | null) {
      if (demo === next) return;
      demo = next;
      callbacks.current.onDemoChange(next);
    }

    function cleanup() {
      if (runRef.current !== run) return;
      const restoreFocus = !run.signal.aborted;
      run.abort();
      window.removeEventListener("resize", onResize);
      restoreZoom?.();
      setDemo(null);
      releaseTourLock(LOCK_ID);
      window.dispatchEvent(new CustomEvent(AGENDA_TUTORIAL_STATE_EVENT, { detail: { active: false } }));
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
        if (step.tab !== callbacks.current.tab) callbacks.current.onTabChange(step.tab);
        setDemo(step.demo ?? null);
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
      if (startTab !== callbacks.current.tab) callbacks.current.onTabChange(startTab);
      // Attend la fin du chargement des données : les zones dépendantes (fiche, employée sélectionnée) en dépendent.
      await waitForSelector(
        startTab === "staff" ? `${selectorFor("team-root")}[data-loading="false"]` : selectorFor("pl-root"),
        run.signal,
      );
      if (run.signal.aborted) return;
      steps = resolveSteps(startTab, canWriteStaff, (selector) => Boolean(findVisibleTarget([selector], true)));
      if (steps.length === 0) throw new Error("Aucune étape disponible.");
      await waitForVisibleTarget([selectorFor(steps[0].target)], run.signal, true);
      if (run.signal.aborted) return;

      restoreZoom = applyInverseZoom();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const last = steps.length - 1;
      const driveSteps: DriveStep[] = steps.map((step) => ({
        element: () => findVisibleTarget([selectorFor(step.target)], true) as HTMLElement,
        disableActiveInteraction: true,
        popover: {
          title: step.number ? `${step.number}. ${step.title}` : step.title,
          description: canWriteStaff || !step.readOnlyDescription ? step.description : step.readOnlyDescription,
          side: step.demo && wide ? "left" : "bottom",
          align: "center",
          nextBtnText: step.index === last ? "Terminer" : step.opener ? "Voir le formulaire" : "Suivant",
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
      window.dispatchEvent(new CustomEvent(AGENDA_TUTORIAL_STATE_EVENT, { detail: { active: true } }));
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
    <div className="min-w-0 max-sm:flex-1 max-sm:[&>button]:w-full max-sm:[&>button]:justify-center">
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
