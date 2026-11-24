import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeGuideStep, resolveGuideSteps, type GuideStep } from "@/components/services/guide-core";
import { PRODUCTS_STEPS, PRODUCT_FORM_DEMO } from "@/components/products/products-guide-steps";

/**
 * Visite guidée de la page Produits & Stock : sélection pure des étapes (droits, liste vide, mise en page mobile ou
 * large, onglet sans catalogue) et cohérence avec les repères posés dans le code de la page.
 */

const ids = (steps: { id: string }[]) => steps.map((s) => s.id);
const present = (targets: readonly string[]) => (target: string) => targets.includes(target);
const pageTargets = (steps: readonly GuideStep[]) => steps.filter((s) => !s.from).map((s) => s.target);

const LIST_TARGETS = [
  "prd-list", "prd-card", "prd-card-stock", "prd-card-prices", "prd-card-moves", "prd-card-menu",
  "prd-focus", "prd-focus-edit", "prd-focus-stock", "prd-focus-actions", "prd-focus-prices",
  "prd-focus-services", "prd-focus-suppliers", "prd-focus-movements",
];
const MOBILE_ONLY = ["prd-kpis-m", "prd-insight-m", "prd-links-m", "prd-categories-m", "prd-filters-m", "prd-switch-m", "prd-card-moves"];
const DESKTOP_ONLY = ["prd-metrics", "prd-charts", "prd-categories", "prd-usage", "prd-stock-filter", "prd-supplier", "prd-view", "prd-focus", "prd-focus-edit", "prd-focus-stock", "prd-focus-actions", "prd-focus-prices", "prd-focus-services", "prd-focus-suppliers", "prd-focus-movements"];

/** Grand écran, tableau : indicateurs, filtres, première ligne, fiche à droite. */
const DESKTOP = pageTargets(PRODUCTS_STEPS).filter((t) => !MOBILE_ONLY.includes(t) && !["prd-card-prices"].includes(t));
/** Mobile ou tablette : liste de cartes, pas de fiche tant que la liste est affichée. */
const MOBILE = pageTargets(PRODUCTS_STEPS).filter((t) => !DESKTOP_ONLY.includes(t) || t === "prd-search");

const resolve = (canWrite: boolean, targets: readonly string[], flags: Record<string, boolean> = {}) =>
  resolveGuideSteps(PRODUCTS_STEPS, { canWrite, flags, isPresent: present(targets) });

describe("page Produits : sélection des étapes", () => {
  it("grand écran avec droit d'écriture : tour de la page puis chaque champ du vrai formulaire", () => {
    const steps = resolve(true, DESKTOP);
    expect(ids(steps)).toEqual([
      "prd-intro", "prd-metrics", "prd-charts", "prd-tabs", "prd-categories", "prd-search", "prd-usage",
      "prd-stock-filter", "prd-supplier", "prd-view", "prd-list", "prd-card", "prd-card-stock", "prd-card-menu",
      "prd-focus", "prd-focus-edit", "prd-focus-stock", "prd-focus-actions", "prd-focus-prices",
      "prd-focus-services", "prd-focus-suppliers", "prd-focus-movements", "prd-add",
      "prd-form-name", "prd-form-purchase", "prd-form-sale", "prd-form-min", "prd-form-max",
      "prd-form-initial", "prd-form-supplier", "prd-form-save",
    ]);
    expect(steps.find((s) => s.id === "prd-add")?.opener).toBe(true);
    // Seuls les champs du formulaire ouvrent le formulaire de démonstration ; le tour de page, jamais.
    expect(steps.filter((s) => s.demo).every((s) => s.demo === PRODUCT_FORM_DEMO)).toBe(true);
    expect(steps.filter((s) => !s.from).some((s) => s.demo)).toBe(false);
  });

  it("n'invente aucun champ absent du formulaire réel (catégorie, unité, marque, SKU, péremption, usage)", () => {
    const form = PRODUCTS_STEPS.filter((s) => s.from);
    expect(ids(form)).toEqual([
      "prd-form-name", "prd-form-purchase", "prd-form-sale", "prd-form-min", "prd-form-max",
      "prd-form-initial", "prd-form-supplier", "prd-form-save",
    ]);
    const titles = form.map((s) => s.title.toLowerCase()).join(" ");
    for (const missing of ["catégorie", "unité", "marque", "référence", "péremption", "usage", "description", "photo"]) {
      expect(titles).not.toContain(missing);
    }
  });

  it("mobile et tablette : indicateurs, filtres et cartes propres à la mise en page, pas de fiche", () => {
    const steps = ids(resolve(true, MOBILE));
    expect(steps).toEqual([
      "prd-intro", "prd-kpis-m", "prd-insight-m", "prd-tabs", "prd-links-m", "prd-search", "prd-categories-m",
      "prd-filters-m", "prd-switch-m", "prd-list", "prd-card", "prd-card-stock", "prd-card-prices", "prd-card-moves",
      "prd-card-menu", "prd-add", "prd-form-name", "prd-form-purchase", "prd-form-sale", "prd-form-min", "prd-form-max",
      "prd-form-initial", "prd-form-supplier", "prd-form-save",
    ]);
    expect(steps).not.toContain("prd-focus");
    expect(steps.indexOf("prd-kpis-m")).toBeGreaterThan(steps.indexOf("prd-intro"));
  });

  it("sans droit d'écriture : consultation seule, aucun bouton d'ajout, de menu, de formulaire", () => {
    const steps = resolve(false, DESKTOP);
    expect(steps.some((s) => s.write || s.from || s.opens || s.demo)).toBe(false);
    expect(steps.every((s) => !s.opener)).toBe(true);
    expect(ids(steps)).not.toContain("prd-add");
    expect(ids(steps)).not.toContain("prd-card-menu");
    expect(ids(steps)).not.toContain("prd-focus-edit");
    // L'étape des actions de stock reste, avec un texte de lecture seule.
    const actions = steps.find((s) => s.id === "prd-focus-actions")!;
    expect(describeGuideStep(actions, { canWrite: false, wide: true })).toMatch(/lecture seule/i);
    const moves = resolveGuideSteps(PRODUCTS_STEPS, { canWrite: false, flags: {}, isPresent: present(MOBILE) }).find((s) => s.id === "prd-card-moves")!;
    expect(describeGuideStep(moves, { canWrite: false, wide: false })).toMatch(/lecture seule/i);
  });

  it("liste vide : écarte la carte, la liste et la fiche, garde le reste jusqu'au formulaire", () => {
    const empty = DESKTOP.filter((t) => !LIST_TARGETS.includes(t));
    const steps = ids(resolve(true, empty));
    expect(steps).toEqual([
      "prd-intro", "prd-metrics", "prd-charts", "prd-tabs", "prd-categories", "prd-search", "prd-usage",
      "prd-stock-filter", "prd-supplier", "prd-view", "prd-add",
      "prd-form-name", "prd-form-purchase", "prd-form-sale", "prd-form-min", "prd-form-max",
      "prd-form-initial", "prd-form-supplier", "prd-form-save",
    ]);
    const emptyMobile = ids(resolve(true, MOBILE.filter((t) => !LIST_TARGETS.includes(t))));
    expect(emptyMobile.some((id) => id.startsWith("prd-card"))).toBe(false);
    expect(emptyMobile).not.toContain("prd-list");
    expect(emptyMobile).toContain("prd-add");
  });

  it("autre onglet (Stock, Mouvements, Inventaire, Alertes) : seules les zones communes de la page restent", () => {
    const common = ["prd-intro", "prd-metrics", "prd-charts", "prd-tabs", "prd-add"];
    const steps = ids(resolve(true, common));
    expect(steps.slice(0, 5)).toEqual(["prd-intro", "prd-metrics", "prd-charts", "prd-tabs", "prd-add"]);
    expect(steps).not.toContain("prd-list");
    expect(steps).toContain("prd-form-save");
  });

  it("rôle sans accès aux montants : indicateurs et prix absents, textes adaptés", () => {
    const hiddenPrices = DESKTOP.filter((t) => !["prd-focus-prices"].includes(t));
    expect(ids(resolve(true, hiddenPrices))).not.toContain("prd-focus-prices");
    for (const id of ["prd-metrics", "prd-charts"]) {
      const step = PRODUCTS_STEPS.find((s) => s.id === id)!;
      expect(describeGuideStep(step, { canWrite: true, wide: true, locked: true }), id).toMatch(/masqué/i);
      expect(describeGuideStep(step, { canWrite: true, wide: true, locked: false }), id).toBe(step.description);
    }
  });

  it("indicateurs mobiles : texte neutre sur les montants, jamais d'affirmation qu'ils sont masqués", () => {
    const step = PRODUCTS_STEPS.find((s) => s.id === "prd-kpis-m")!;
    expect(step.lockedDescription).toBeUndefined();
    expect(step.description).toMatch(/peuvent être masqués/i);
  });

  it("filtre fournisseur : seulement quand la page l'affiche", () => {
    const steps = ids(resolve(true, DESKTOP.filter((t) => t !== "prd-supplier")));
    expect(steps).not.toContain("prd-supplier");
    expect(steps).toContain("prd-usage");
  });

  it("numérote de façon contiguë, introduction non numérotée", () => {
    const steps = resolve(true, DESKTOP);
    expect(steps[0].number).toBeNull();
    expect(steps.slice(1).map((s) => s.number)).toEqual(steps.slice(1).map((_, i) => i + 1));
    expect(steps.map((s) => s.index)).toEqual(steps.map((_, i) => i));
  });

  it("identifiants et cibles uniques, vouvoiement", () => {
    expect(new Set(PRODUCTS_STEPS.map((s) => s.id)).size).toBe(PRODUCTS_STEPS.length);
    expect(new Set(PRODUCTS_STEPS.map((s) => s.target)).size).toBe(PRODUCTS_STEPS.length);
    const text = PRODUCTS_STEPS
      .flatMap((s) => [s.title, s.description, s.mobileDescription, s.readOnlyDescription, s.lockedDescription])
      .join(" ");
    expect(text).not.toMatch(/\b(tu|ton|ta|tes|toi|ajoute|clique|saisis|choisis)\b/i);
  });
});

describe("repères posés dans le code de la page Produits", () => {
  const root = path.resolve(__dirname, "../..");
  const file = (name: string) => readFileSync(path.join(root, "src/components/inventory", name), "utf8");
  const code = [
    "products-stock-page.tsx", "products-page.tsx", "products-mobile.tsx", "product-premium-card.tsx",
    "product-focus-panel.tsx", "product-form.tsx", "inventory-premium-header.tsx",
  ].map(file).join("\n");

  it("chaque cible de la visite existe dans le code", () => {
    for (const step of PRODUCTS_STEPS) expect(code, step.target).toContain(`"${step.target}"`);
    expect(code).toContain('data-products-tour="prd-root"');
  });

  it("aucune écriture en démonstration : chaque fonction d'écriture sort pendant la visite", () => {
    const page = file("products-page.tsx");
    for (const fn of ["openCreate", "openEdit", "handleSubmit", "handleToggle", "handleDelete", "applyStock"]) {
      expect(page, fn).toMatch(new RegExp(`async function ${fn}\\([^)]*\\)[^{]*\\{\\s*if \\([^)]*inTutorial\\(\\)\\) return;`));
    }
    expect(page).toMatch(/function openStock\([^)]*\) \{\s*if \(inTutorial\(\)\) return;/);
    expect(page).toMatch(/onSubmit=\{async \(quantity\) => \{\s*if \(inTutorial\(\)\) return;/);
    const shell = file("products-stock-page.tsx");
    expect(shell).toMatch(/function handleCreateProduct\(\) \{\s*if \(tourRef\.current\) return;/);
    expect(shell).toContain("tutorialMode");
    const form = file("product-form.tsx");
    expect(form).toContain("if (tutorialMode) return;");
    expect(form).toContain("disabled={submitting || tutorialMode}");
  });

  it("le bouton Tutoriel est rendu hors des deux versions (mobile et large) et le bouton d'ajout du parcours reste unique", () => {
    const shell = file("products-stock-page.tsx");
    expect(shell.match(/<ProductsGuide/g)).toHaveLength(1);
    expect(shell.match(/data-products-tour="prd-add"/g)).toHaveLength(1);
  });
});
