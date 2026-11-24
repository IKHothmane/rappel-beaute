import { describe, expect, it } from "vitest";
import type { TutorialProgress } from "@/components/tutorial/api";
import { applicableSteps, isTourStepId, TOUR_STEPS } from "@/components/tutorial/steps";

/**
 * Parcours déclaratif du tutoriel de première connexion : ordre métier, conditions de réussite calculées depuis la
 * progression serveur, étape facultative, et saut des étapes que le forfait verrouille (même règle que la sidebar).
 */
const EMPTY: TutorialProgress = { services: 0, staff: 0, staffWithSchedule: 0, resources: 0, appointments: 0 };
const step = (id: string) => {
  const found = TOUR_STEPS.find((s) => s.id === id);
  if (!found) throw new Error(`étape inconnue : ${id}`);
  return found;
};
const allowing = (...keys: string[]) => (key: string) => keys.includes(key);

describe("ordre du parcours", () => {
  it("enchaîne services -> équipe -> horaires -> ressources -> agenda", () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual(["services", "staff", "planning", "resources", "agenda"]);
  });

  it("route chaque étape vers une page dont le pathname est normalisé (slash final, sans query)", () => {
    for (const s of TOUR_STEPS) {
      expect(s.pathname).toMatch(/^\/.*\/$/);
      expect(s.pathname).not.toContain("?");
      expect(s.route.startsWith(s.pathname)).toBe(true);
      expect(s.targets.length).toBeGreaterThan(0);
    }
    // Les horaires se règlent dans la même page que l'équipe, mais l'onglet Planning est ciblé par la query.
    expect(step("planning").pathname).toBe(step("staff").pathname);
    expect(step("planning").route).not.toBe(step("staff").route);
  });
});

describe("cibles de l'étape horaires", () => {
  it("désigne le bouton « Modifier les horaires » de la fiche, jamais le panneau d'édition (l'hôte est en pause quand il est ouvert)", () => {
    const [primary, ...fallbacks] = step("planning").targets;
    expect(primary).toBe('[data-tour="staff-schedule-edit"]');
    expect(step("planning").targets).not.toContain('[data-tour="staff-schedule"]');
    // Sans employée, le bouton n'existe pas : repli sur l'onglet Planning, avec un texte adapté.
    expect(fallbacks).toEqual(['[data-tour="staff-planning-tab"]']);
    expect(step("planning").fallbackDescription).toMatch(/employée/);
    expect(step("planning").fallbackDescription).not.toBe(step("planning").description);
    expect(step("planning").description).toMatch(/Modifier les horaires/);
  });

  it("les autres étapes n'ont pas de texte de repli", () => {
    expect(TOUR_STEPS.filter((s) => s.fallbackDescription).map((s) => s.id)).toEqual(["planning"]);
  });
});

describe("libellés de la page de configuration (une seule source avec le parcours)", () => {
  it("chaque étape porte son libellé, son indice et son appel à l'action", () => {
    for (const s of TOUR_STEPS) {
      expect(s.checklist.label.length, s.id).toBeGreaterThan(0);
      expect(s.checklist.hint.length, s.id).toBeGreaterThan(0);
      expect(s.checklist.cta.length, s.id).toBeGreaterThan(0);
    }
  });
});

describe("conditions de réussite (calculées depuis la progression, jamais mémorisées)", () => {
  it("rien n'est réussi sans donnée", () => {
    expect(TOUR_STEPS.filter((s) => s.done(EMPTY))).toEqual([]);
  });

  it.each([
    ["services", { services: 1 }],
    ["staff", { staff: 1 }],
    ["planning", { staffWithSchedule: 1 }],
    ["resources", { resources: 3 }],
    ["agenda", { appointments: 1 }],
  ])("l'étape %s n'est réussie que par sa propre donnée", (id, patch) => {
    const progress = { ...EMPTY, ...patch };
    expect(step(id).done(progress)).toBe(true);
    for (const other of TOUR_STEPS.filter((s) => s.id !== id)) {
      expect(other.done(progress), `${other.id} ne doit pas être réussie par ${id}`).toBe(false);
    }
  });

  it("une employée sans horaires ne valide pas l'étape planning", () => {
    const progress = { ...EMPTY, staff: 2, staffWithSchedule: 0 };
    expect(step("staff").done(progress)).toBe(true);
    expect(step("planning").done(progress)).toBe(false);
  });
});

describe("étape facultative", () => {
  it("seule l'étape ressources se passe avec « Suivant »", () => {
    expect(TOUR_STEPS.filter((s) => s.optional).map((s) => s.id)).toEqual(["resources"]);
  });
});

describe("applicableSteps (forfait)", () => {
  it("garde les cinq étapes quand tout est activé", () => {
    expect(applicableSteps(() => true).map((s) => s.id)).toHaveLength(5);
  });

  it("saute les étapes verrouillées en conservant l'ordre", () => {
    const ids = applicableSteps(allowing("services", "staff", "planning", "agenda")).map((s) => s.id);
    expect(ids).toEqual(["services", "staff", "planning", "agenda"]);
  });

  it("une étape reste proposée si une seule de ses clés de navigation est active (staff OU planning)", () => {
    expect(applicableSteps(allowing("planning")).map((s) => s.id)).toEqual(["staff", "planning"]);
    expect(applicableSteps(allowing("staff")).map((s) => s.id)).toEqual(["staff", "planning"]);
  });

  it("ne renvoie rien quand tout est verrouillé (le tutoriel ne s'affiche alors pas)", () => {
    expect(applicableSteps(() => false)).toEqual([]);
  });
});

describe("isTourStepId", () => {
  it("reconnaît les étapes du parcours et rejette welcome, l'inconnu et le vide", () => {
    for (const s of TOUR_STEPS) expect(isTourStepId(s.id)).toBe(true);
    expect(isTourStepId("welcome")).toBe(false);
    expect(isTourStepId("nope")).toBe(false);
    expect(isTourStepId(null)).toBe(false);
    expect(isTourStepId(undefined)).toBe(false);
    expect(isTourStepId("")).toBe(false);
  });
});
