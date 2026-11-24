import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeGuideStep,
  nextButtonLabel,
  resolveGuideSteps,
  widthBucketOf,
  type GuideStep,
} from "@/components/services/guide-core";
import { canEditServicePrice, canWriteFeature, FEATURE_ACCESS, type AppRole } from "@/lib/rbac";
import { SERVICES_STEPS, SERVICE_FORM_DEMO } from "@/components/services/services-guide-steps";
import { RESOURCES_STEPS, RESOURCE_FORM_DEMO, RESOURCE_SERVICES_FLAG } from "@/components/resources/resources-guide-steps";

/**
 * Visites guidées des pages Services et Ressources : sélection pure des étapes (droits, listes vides, mise en page
 * mobile ou large, formulaire indisponible) et cohérence avec les repères posés dans le code des pages.
 */

const ids = (steps: { id: string }[]) => steps.map((s) => s.id);

/** Repères présents selon la mise en page ; « tout » = version large avec une liste non vide. */
const present = (targets: readonly string[]) => (target: string) => targets.includes(target);
const allTargets = (steps: readonly GuideStep[]) => steps.filter((s) => !s.from).map((s) => s.target);

const SERVICES_DESKTOP = allTargets(SERVICES_STEPS).filter((t) => !["svc-status"].includes(t));
const SERVICES_MOBILE = allTargets(SERVICES_STEPS).filter((t) => !["svc-categories"].includes(t));
const RESOURCES_DESKTOP = allTargets(RESOURCES_STEPS).filter((t) => !["res-collision", "res-maintenance"].includes(t));
const RESOURCES_MOBILE = allTargets(RESOURCES_STEPS).filter(
  (t) => !["res-focus", "res-focus-actions"].includes(t),
);

describe("page Services : sélection des étapes", () => {
  const resolve = (canWrite: boolean, targets: readonly string[], flags: Record<string, boolean> = { form: true }) =>
    resolveGuideSteps(SERVICES_STEPS, { canWrite, flags, isPresent: present(targets) });

  it("avec le droit d'écriture, propose le tour complet puis chaque champ du vrai formulaire", () => {
    const steps = resolve(true, SERVICES_DESKTOP);
    expect(ids(steps)).toEqual([
      "svc-intro", "svc-metrics", "svc-search", "svc-categories", "svc-list", "svc-card", "svc-card-status",
      "svc-card-meta", "svc-card-staff", "svc-card-edit", "svc-card-menu", "svc-add",
      "svc-form-name", "svc-form-description", "svc-form-price", "svc-form-duration", "svc-form-staff",
      "svc-form-products", "svc-form-status", "svc-form-save",
    ]);
    expect(steps.find((s) => s.id === "svc-add")?.opener).toBe(true);
    // Les champs de formulaire ouvrent le formulaire de démonstration ; le tour de page, jamais.
    expect(steps.filter((s) => s.demo).every((s) => s.demo === SERVICE_FORM_DEMO)).toBe(true);
    expect(steps.filter((s) => !s.from).some((s) => s.demo)).toBe(false);
  });

  it("n'invente aucun champ absent du formulaire réel (catégorie, visibilité en ligne, acompte, photo à envoyer)", () => {
    const text = SERVICES_STEPS.filter((s) => s.from).map((s) => `${s.title} ${s.description}`).join(" ").toLowerCase();
    for (const missing of ["acompte", "visibilité en ligne", "téléverser", "importer une photo"]) {
      expect(text).not.toContain(missing);
    }
    expect(SERVICES_STEPS.some((s) => s.id === "svc-form-category")).toBe(false);
  });

  it("sans droit d'écriture : aucune étape de création, de menu d'actions ni de formulaire", () => {
    const steps = resolve(false, SERVICES_DESKTOP);
    expect(steps.some((s) => s.write || s.from || s.opens || s.demo)).toBe(false);
    expect(ids(steps)).toContain("svc-card-edit");
    expect(ids(steps)).not.toContain("svc-add");
    expect(steps.every((s) => !s.opener)).toBe(true);
    expect(describeGuideStep(steps.find((s) => s.id === "svc-card-edit")!, { canWrite: false, wide: true })).toMatch(/lecture seule/i);
  });

  it("liste vide : écarte la carte et ses détails, garde le reste, sans jamais bloquer", () => {
    const empty = SERVICES_DESKTOP.filter((t) => !["svc-list", "svc-card", "svc-card-status", "svc-card-meta", "svc-card-staff", "svc-card-edit", "svc-card-menu"].includes(t));
    const steps = resolve(true, empty);
    expect(ids(steps)).toEqual([
      "svc-intro", "svc-metrics", "svc-search", "svc-categories", "svc-add",
      "svc-form-name", "svc-form-description", "svc-form-price", "svc-form-duration", "svc-form-staff",
      "svc-form-products", "svc-form-status", "svc-form-save",
    ]);
  });

  it("formulaire indisponible (options non chargées) : ni bouton d'ouverture ni champs", () => {
    const steps = resolve(true, SERVICES_DESKTOP, { form: false });
    expect(ids(steps)).not.toContain("svc-add");
    expect(steps.some((s) => s.from)).toBe(false);
  });

  it("mobile et tablette : filtres par état à la place des catégories, mêmes cartes", () => {
    const steps = ids(resolve(true, SERVICES_MOBILE));
    expect(steps).toContain("svc-status");
    expect(steps).not.toContain("svc-categories");
    expect(steps).toContain("svc-card-menu");
  });

  it("numérote de façon contiguë, introduction non numérotée", () => {
    const steps = resolve(true, SERVICES_DESKTOP);
    expect(steps[0].number).toBeNull();
    expect(steps.slice(1).map((s) => s.number)).toEqual(steps.slice(1).map((_, i) => i + 1));
    expect(steps.map((s) => s.index)).toEqual(steps.map((_, i) => i));
  });

  it("pas de texte « tarif verrouillé » : le champ Prix n'est proposé qu'aux rôles qui peuvent aussi modifier le tarif", () => {
    // Les étapes du formulaire exigent le droit d'écriture sur les services ; ce droit est celui du tarif pour chaque rôle.
    const price = SERVICES_STEPS.find((s) => s.id === "svc-form-price")!;
    expect(price.write).toBe(true);
    expect(price.lockedDescription).toBeUndefined();
    for (const role of Object.keys(FEATURE_ACCESS) as AppRole[]) {
      expect(canEditServicePrice(role), role).toBe(canWriteFeature(role, "services"));
    }
  });

  it("le texte « champ verrouillé » reste disponible pour les autres visites (Produits)", () => {
    const step: GuideStep = { id: "p", target: "p", title: "t", description: "normal", lockedDescription: "verrouillé" };
    expect(describeGuideStep(step, { canWrite: true, wide: true, locked: true })).toBe("verrouillé");
    expect(describeGuideStep(step, { canWrite: true, wide: true, locked: false })).toBe("normal");
  });
});

describe("page Ressources : sélection des étapes", () => {
  const resolve = (canWrite: boolean, targets: readonly string[], flags: Record<string, boolean> = { [RESOURCE_SERVICES_FLAG]: true }) =>
    resolveGuideSteps(RESOURCES_STEPS, { canWrite, flags, isPresent: present(targets) });

  it("avec le droit d'écriture, propose le tour complet puis chaque champ du vrai formulaire", () => {
    const steps = resolve(true, RESOURCES_DESKTOP);
    expect(ids(steps)).toEqual([
      "res-intro", "res-metrics", "res-search", "res-filters", "res-list", "res-card", "res-card-status",
      "res-card-edit", "res-focus", "res-focus-actions", "res-add",
      "res-form-name", "res-form-type", "res-form-services", "res-form-save",
    ]);
    expect(steps.filter((s) => s.demo).every((s) => s.demo === RESOURCE_FORM_DEMO)).toBe(true);
  });

  it("n'invente aucun champ absent du formulaire réel (capacité, horaires, couleur, statut à la création)", () => {
    const form = RESOURCES_STEPS.filter((s) => s.from);
    expect(ids(form)).toEqual(["res-form-name", "res-form-type", "res-form-services", "res-form-save"]);
    const text = form.map((s) => `${s.title} ${s.description}`).join(" ").toLowerCase();
    for (const missing of ["capacité", "horaires", "couleur"]) expect(text).not.toContain(missing);
  });

  it("aucune prestation à associer : écarte seulement ce champ", () => {
    const steps = ids(resolve(true, RESOURCES_DESKTOP, { [RESOURCE_SERVICES_FLAG]: false }));
    expect(steps).not.toContain("res-form-services");
    expect(steps).toContain("res-form-name");
    expect(steps).toContain("res-form-save");
  });

  it("sans droit d'écriture : tour de consultation uniquement", () => {
    const steps = resolve(false, RESOURCES_DESKTOP);
    expect(steps.some((s) => s.write || s.from || s.opens || s.demo)).toBe(false);
    expect(ids(steps)).toEqual(["res-intro", "res-metrics", "res-search", "res-filters", "res-list", "res-card", "res-card-status", "res-focus"]);
  });

  it("liste vide : seules les zones de la page restent, sans carte ni fiche", () => {
    const steps = ids(resolve(true, ["res-intro", "res-metrics", "res-search", "res-filters", "res-add"]));
    expect(steps).toEqual([
      "res-intro", "res-metrics", "res-search", "res-filters", "res-add",
      "res-form-name", "res-form-type", "res-form-services", "res-form-save",
    ]);
  });

  it("liste : le texte mobile décrit la carte mobile (rendez-vous du jour et capacité, pas le nombre de prestations)", () => {
    const list = RESOURCES_STEPS.find((s) => s.id === "res-list")!;
    expect(describeGuideStep(list, { canWrite: true, wide: true })).toMatch(/prestations associées/i);
    const mobile = describeGuideStep(list, { canWrite: true, wide: false });
    expect(mobile).toMatch(/rendez-vous du jour/i);
    expect(mobile).toMatch(/capacité/i);
    expect(mobile).not.toMatch(/prestations associées/i);
  });

  it("mobile : anti-collision et bouton Maintenance, pas de fiche tant que la liste est affichée", () => {
    const steps = ids(resolve(true, RESOURCES_MOBILE));
    expect(steps).toContain("res-collision");
    expect(steps).toContain("res-maintenance");
    expect(steps).not.toContain("res-focus");
    expect(steps.indexOf("res-collision")).toBeLessThan(steps.indexOf("res-metrics"));
  });
});

describe("textes et boutons", () => {
  it("choisit le texte selon les droits et la mise en page", () => {
    const step: GuideStep = {
      id: "x", target: "x", title: "t", description: "large", mobileDescription: "mobile", readOnlyDescription: "lecture",
    };
    expect(describeGuideStep(step, { canWrite: true, wide: true })).toBe("large");
    expect(describeGuideStep(step, { canWrite: true, wide: false })).toBe("mobile");
    expect(describeGuideStep(step, { canWrite: false, wide: false })).toBe("lecture");
    expect(describeGuideStep({ ...step, readOnlyDescription: undefined }, { canWrite: false, wide: false })).toBe("mobile");
  });

  it("Voir le formulaire sur l'étape d'ouverture, Terminer sur la dernière", () => {
    expect(nextButtonLabel({ index: 3, opener: true }, 9)).toBe("Voir le formulaire");
    expect(nextButtonLabel({ index: 2, opener: false }, 9)).toBe("Suivant");
    expect(nextButtonLabel({ index: 9, opener: true }, 9)).toBe("Terminer");
  });

  it("referme la visite quand l'écran change de palier de largeur", () => {
    expect([390, 767, 768, 1023, 1024, 1279, 1280, 1920].map(widthBucketOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("vouvoiement : aucun tutoiement dans les textes", () => {
    const text = [...SERVICES_STEPS, ...RESOURCES_STEPS]
      .flatMap((s) => [s.title, s.description, s.mobileDescription, s.readOnlyDescription, s.lockedDescription])
      .join(" ");
    expect(text).not.toMatch(/\b(tu|ton|ta|tes|toi|ajoute|clique|saisis|choisis)\b/i);
  });
});

describe("repères posés dans le code des pages", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (dir: string, skip: string[]) =>
    readdirSync(path.join(root, dir))
      .filter((f) => /\.tsx?$/.test(f) && !skip.includes(f))
      .map((f) => readFileSync(path.join(root, dir, f), "utf8"))
      .join("\n");

  it("chaque cible de la visite Services existe dans le code (et le repère du parcours de première connexion est conservé)", () => {
    const code = read("src/components/services", ["services-guide-steps.ts", "guide-core.ts", "guide-runner.tsx", "services-guide.tsx"]);
    for (const step of SERVICES_STEPS) expect(code, step.target).toContain(`"${step.target}"`);
    expect(code.match(/data-tour="services-add"/g)).toHaveLength(2);
    expect(code).toContain('"svc-root"');
  });

  it("chaque cible de la visite Ressources existe dans le code (et le repère du parcours de première connexion est conservé)", () => {
    const code = read("src/components/resources", ["resources-guide-steps.ts", "resources-guide.tsx"]);
    for (const step of RESOURCES_STEPS) expect(code, step.target).toContain(`"${step.target}"`);
    expect(code.match(/data-tour="resources-add"/g)).toHaveLength(2);
    expect(code).toContain('data-resources-tour="res-root"');
  });

  /** Corps d'une fonction `function name(...) {` (accolades appariées), sans les commentaires. */
  const bodyOf = (code: string, name: string) => {
    const start = code.indexOf(`function ${name}(`);
    expect(start, name).toBeGreaterThanOrEqual(0);
    const open = code.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}" && --depth === 0) return code.slice(open + 1, i).replace(/\/\/.*$/gm, "");
    }
    throw new Error(`corps introuvable : ${name}`);
  };
  const firstStatement = (body: string) => body.trim().split(/\r?\n/)[0].trim();

  it("aucune écriture pendant la visite : chaque fonction d'écriture ou d'ouverture de tiroir sort d'emblée si la visite est active", () => {
    const services = readFileSync(path.join(root, "src/components/services/services-page.tsx"), "utf8");
    for (const fn of ["handleSubmit", "openCreate", "openEdit"]) {
      expect(firstStatement(bodyOf(services, fn)), fn).toBe("if (tutorialBusy()) return;");
    }
    for (const fn of ["toggleActive", "confirmDelete"]) {
      expect(firstStatement(bodyOf(services, fn)), fn).toBe("if (!canWrite || tutorialBusy()) return;");
    }
    // Les chargements asynchrones revérifient avant d'ouvrir le tiroir réel.
    expect(bodyOf(services, "openEdit")).toMatch(/await[\s\S]*if \(tutorialBusy\(\)\) return;[\s\S]*setDrawerOpen\(true\)/);
    expect(bodyOf(services, "openCreate")).toMatch(/await[\s\S]*if \(tutorialBusy\(\)\) return;[\s\S]*setDrawerOpen\(true\)/);
    expect(services).toContain("const tutorialBusy = () => demoRef.current || tourActiveRef.current;");
    expect(services).toContain("onActiveChange={handleActiveChange}");

    const resources = readFileSync(path.join(root, "src/components/resources/resources-page.tsx"), "utf8");
    for (const fn of ["handleSubmit", "openCreate", "openEdit", "openMaintenance", "selectResource"]) {
      expect(firstStatement(bodyOf(resources, fn)), fn).toBe("if (tutorialBusy()) return;");
    }
    for (const fn of ["handleToggle", "handleDelete"]) {
      expect(firstStatement(bodyOf(resources, fn)), fn).toBe("if (!canWrite || tutorialBusy()) return;");
    }
    expect(firstStatement(bodyOf(resources, "finishMaintenance"))).toBe("if (!selected || tutorialBusy()) return;");
    expect(bodyOf(resources, "openEdit")).toMatch(/await[\s\S]*if \(tutorialBusy\(\)\) return;[\s\S]*setDrawerOpen\(true\)/);
    expect(resources).toMatch(/onSubmit=\{async \(input\) => \{\s*if \(tutorialBusy\(\)\) return;/);
    expect(resources).toContain("const tutorialBusy = () => demoRef.current || tourActiveRef.current;");
    expect(resources).toContain("onActiveChange={handleActiveChange}");
    // Le repère de statut est dans le bouton de la carte : la sélection passe par le garde, jamais par setSelectedId.
    expect(resources).toContain("onSelect={() => selectResource(resource.id)}");
    expect(resources).toContain("onSelect={selectResource}");
    expect(resources).not.toMatch(/onSelect=\{setSelectedId\}/);
    expect(services).toContain("tutorialMode={demo}");
    expect(resources).toContain("tutorialMode={demo}");
    for (const form of ["src/components/services/service-form.tsx", "src/components/resources/resource-form.tsx"]) {
      const code = readFileSync(path.join(root, form), "utf8");
      expect(code).toContain("if (tutorialMode) return;");
      expect(code).toContain("disabled={submitting || tutorialMode}");
    }
  });
});
