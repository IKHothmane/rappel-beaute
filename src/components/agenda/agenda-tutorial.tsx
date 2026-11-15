"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import type { Driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./agenda-tutorial.css";

const STEPS = [
  { target: "intro", title: "Découvrir votre agenda", description: "Nous allons parcourir l’agenda, puis ouvrir le formulaire pour vous montrer comment ajouter un rendez-vous. Aucun rendez-vous ne sera enregistré pendant cette démonstration." },
  { target: "dates", title: "1. Choisir la période", description: "Les flèches changent de période. Aujourd’hui revient à la date du jour. Choisissez Jour, Semaine ou Mois pour adapter l’affichage." },
  { target: "filters", title: "2. Filtrer le planning", description: "Affichez les rendez-vous d’une praticienne, d’un service, d’une cabine ou d’un statut. Les filtres restent inchangés pendant cette visite." },
  { target: "create", title: "3. Ajouter un rendez-vous", description: "Ce bouton ouvre le formulaire d’ajout. Cliquez sur Voir le formulaire pour le découvrir en mode démonstration." },
  { target: "customer", title: "4. Choisir la cliente", description: "Recherchez une cliente existante, ou utilisez Nouvelle cliente pour renseigner son nom et son téléphone. En utilisation normale, vous pouvez aussi créer un rendez-vous pour une cliente de passage.", form: true },
  { target: "service", title: "5. Choisir la prestation", description: "Sélectionnez le service principal. Sa durée et son prix servent de base au rendez-vous. Vous pouvez ensuite ajouter d’autres prestations si nécessaire.", form: true },
  { target: "staff", title: "6. Affecter la praticienne", description: "Choisissez la personne qui réalisera la prestation. Ses horaires et ses disponibilités sont pris en compte pour proposer les créneaux.", form: true },
  { target: "resource", title: "7. Choisir la cabine", description: "Si la prestation utilise une cabine ou une ressource, sélectionnez-la ici. Ce champ est optionnel lorsque votre organisation n’en nécessite pas.", form: true },
  { target: "date", title: "8. Indiquer la date", description: "Saisissez la date au format JJ/MM/AAAA ou choisissez-la dans le calendrier. Les jours de fermeture et les disponibilités de l’équipe sont pris en compte.", form: true },
  { target: "slots", title: "9. Sélectionner un créneau", description: "Choisissez une heure disponible. Les créneaux se recalculent selon la date, la durée des prestations, la praticienne et la cabine. Si aucun créneau ne convient, changez l’un de ces critères.", form: true },
  { target: "price", title: "10. Vérifier le prix", description: "Le prix est calculé à partir des prestations choisies. Vérifiez-le avant de valider ; vous pouvez l’ajuster si nécessaire.", form: true },
  { target: "save", title: "11. Enregistrer le rendez-vous", description: "En utilisation normale, cliquez sur Créer le rendez-vous après avoir vérifié la cliente, les prestations, la date et l’horaire. Le bouton est désactivé ici : Terminer fermera simplement la démonstration.", form: true },
] as const;

function targetElement(target: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-agenda-tour="${target}"]`))
    .find(element => element.getClientRects().length > 0);
}

/** Wait for React and the side panel's slide animation before measuring the field. */
function waitForTarget(target: string, signal: AbortSignal): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    let previous = "";
    let stable = 0;
    let scrolled: HTMLElement | undefined;
    const frame = () => {
      if (signal.aborted) { reject(new Error("Visite fermée.")); return; }
      const element = targetElement(target);
      if (element) {
        if (scrolled !== element) { element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }); scrolled = element; }
        const rect = element.getBoundingClientRect();
        const bounds = [rect.x, rect.y, rect.width, rect.height].map(Math.round).join(",");
        stable = bounds === previous ? stable + 1 : 0;
        previous = bounds;
        if (stable >= 6) { resolve(element); return; }
      }
      if (performance.now() - started > 6000) { reject(new Error("La zone du tutoriel n’est pas disponible. Fermez la visite puis réessayez.")); return; }
      requestAnimationFrame(frame);
    };
    frame();
  });
}

export function AgendaTutorial({ onOpenCreate, onCloseCreate }: { onOpenCreate: () => void; onCloseCreate: () => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tourRef = useRef<Driver | null>(null);
  const callbacks = useRef({ onOpenCreate, onCloseCreate });
  callbacks.current = { onOpenCreate, onCloseCreate };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const media = window.matchMedia("(min-width: 1024px)");
    const resize = () => { if (!media.matches) tourRef.current?.destroy(); };
    media.addEventListener("change", resize);
    return () => { mounted.current = false; media.removeEventListener("change", resize); tourRef.current?.destroy(); };
  }, []);

  async function start() {
    if (loading || tourRef.current?.isActive() || !window.matchMedia("(min-width: 1024px)").matches) return;
    setLoading(true);
    setError(null);
    try {
      const { driver } = await import("driver.js");
      if (!mounted.current || !window.matchMedia("(min-width: 1024px)").matches) return;
      const abort = new AbortController();
      // The app renders at html zoom: 0.8; Driver positions popovers in viewport pixels.
      const previousZoom = document.body.style.getPropertyValue("--agenda-tour-inverse-zoom");
      const rootZoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      document.body.style.setProperty("--agenda-tour-inverse-zoom", String(1 / rootZoom));
      let formOpen = false;
      let moving = false;
      const navigate = async (index: number) => {
        if (moving || abort.signal.aborted) return;
        if (index >= STEPS.length) { tourRef.current?.destroy(); return; }
        if (index < 0) return;
        moving = true;
        try {
          const needsForm = "form" in STEPS[index];
          if (needsForm && !formOpen) { callbacks.current.onOpenCreate(); formOpen = true; }
          else if (!needsForm && formOpen) { callbacks.current.onCloseCreate(); formOpen = false; }
          await waitForTarget(STEPS[index].target, abort.signal);
          if (!abort.signal.aborted) tourRef.current?.moveTo(index);
        } catch (cause) {
          if (!abort.signal.aborted) {
            setError(cause instanceof Error ? cause.message : "Tutoriel indisponible.");
            tourRef.current?.destroy();
          }
        } finally { moving = false; }
      };
      const steps: DriveStep[] = STEPS.map((step, index) => ({
        element: () => targetElement(step.target) as HTMLElement,
        disableActiveInteraction: true,
        popover: {
          title: step.title, description: step.description,
          side: "form" in step ? "left" : "bottom", align: "center",
          nextBtnText: index === 3 ? "Voir le formulaire" : index === STEPS.length - 1 ? "Terminer" : "Suivant",
        },
      }));
      tourRef.current = driver({
        steps, animate: false, smoothScroll: false, stagePadding: 6, stageRadius: 12,
        overlayOpacity: 0.55, overlayClickBehavior: "none", popoverClass: "agenda-tour-popover",
        showProgress: true, progressText: "Étape {{current}} sur {{total}}", nextBtnText: "Suivant", prevBtnText: "Précédent", doneBtnText: "Terminer", closeBtnLabel: "Fermer le tutoriel",
        onNextClick: () => { void navigate((tourRef.current?.getActiveIndex() ?? 0) + 1); },
        onPrevClick: () => { void navigate((tourRef.current?.getActiveIndex() ?? 0) - 1); },
        onDestroyed: () => {
          abort.abort();
          if (previousZoom) document.body.style.setProperty("--agenda-tour-inverse-zoom", previousZoom);
          else document.body.style.removeProperty("--agenda-tour-inverse-zoom");
          if (formOpen) callbacks.current.onCloseCreate();
          tourRef.current = null;
          if (mounted.current) triggerRef.current?.focus({ preventScroll: true });
        },
      });
      tourRef.current.drive();
    } catch {
      if (mounted.current) setError("Impossible de démarrer le tutoriel. Réessayez.");
    } finally { if (mounted.current) setLoading(false); }
  }

  return <div className="hidden lg:block">
    <button ref={triggerRef} type="button" disabled={loading} onClick={() => void start()}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#F0D9E3] bg-white/90 px-3 text-sm font-semibold text-[#7D3152] shadow-sm hover:bg-white disabled:opacity-60">
      <BookOpen size={17} aria-hidden /> {loading ? "Chargement…" : "Tutoriel"}
    </button>
    {error ? <p role="alert" className="mt-1 max-w-xs text-xs text-red-700">{error}</p> : null}
  </div>;
}
