import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InventoryPremiumHeader } from "@/components/inventory/inventory-premium-header";
import { ProductFocusPanel } from "@/components/inventory/product-focus-panel";
import { ProductForm } from "@/components/inventory/product-form";
import { ProductPremiumCard } from "@/components/inventory/product-premium-card";
import { ProductsMobile } from "@/components/inventory/products-mobile";
import type { ProductListItem } from "@/types/inventory";

/**
 * Balisage rendu côté serveur (le projet n'embarque pas jsdom) : les repères de la visite Produits existent dans les
 * versions mobile et large, seule la première carte les porte, l'accès en lecture seule ne rend aucune action
 * d'écriture ciblée et le formulaire de démonstration désactive l'enregistrement. La mise en page réelle (zoom 0,8,
 * 1280/768/390) n'est pas couverte ici.
 */
const product = (id: string, extra: Partial<ProductListItem> = {}): ProductListItem =>
  ({
    id, name: `Produit ${id}`, sku: `SKU-${id}`, brand: null, category: "CONSOMMABLE", unit: "UNIT", stock: 5, minStock: 2,
    maxStock: null, alert: "OK", purchasePrice: 10, salePrice: 20, stockValue: 50, supplierName: null, sellable: true,
    consumable: true, active: true, serviceCount: 0, ...extra,
  }) as unknown as ProductListItem;

const count = (html: string, value: string) => html.split(`data-products-tour="${value}"`).length - 1;
const noop = () => {};

describe("page Produits : repères du balisage", () => {
  const mobile = (canWrite: boolean, filtered = [product("a"), product("b")], financeHidden = false) =>
    renderToStaticMarkup(
      <ProductsMobile
        orgName="Institut" catalogCount={filtered.length} kpis={null} optimalCount={filtered.length} openOrders={0}
        supplierCount={0} lowMarginCount={0} canWrite={canWrite} financeHidden={financeHidden} posRevenue={null}
        posMargin={null} insight="" searchInput="" onSearchChange={noop} searchRef={{ current: null }} category=""
        onCategory={noop} alert="" onAlert={noop} usage="all" onUsage={noop} categoryCounts={[["CONSOMMABLE", filtered.length]]}
        filtered={filtered} loading={false} selectedId={null} onSelect={noop} selected={null} onCreate={noop}
        onEdit={noop} onToggle={noop} onDelete={noop} onAdjustIn={noop} onAdjustOut={noop} onStepIn={noop} onStepOut={noop}
      />,
    );

  it("version mobile : repères de page et de première carte, une seule fois chacun", () => {
    const html = mobile(true);
    for (const t of ["prd-kpis-m", "prd-insight-m", "prd-links-m", "prd-search", "prd-categories-m", "prd-filters-m", "prd-switch-m", "prd-list", "prd-card", "prd-card-stock", "prd-card-prices", "prd-card-moves", "prd-card-menu"]) {
      expect(count(html, t), t).toBe(1);
    }
  });

  it("mobile en lecture seule : pas de menu d'actions, le bouton « Voir la fiche » remplace Entrée/Sortie", () => {
    const html = mobile(false);
    expect(count(html, "prd-card-menu")).toBe(0);
    expect(count(html, "prd-card-moves")).toBe(1);
    expect(html).toContain("Voir la fiche");
    expect(html).not.toContain("Entrée");
  });

  it("mobile sans accès aux montants : pas de repère de prix", () => {
    expect(count(mobile(true, [product("a")], true), "prd-card-prices")).toBe(0);
  });

  it("liste vide : aucun repère de liste ni de carte", () => {
    const html = mobile(true, []);
    for (const t of ["prd-list", "prd-card", "prd-card-stock", "prd-card-prices", "prd-card-moves", "prd-card-menu"]) {
      expect(count(html, t), t).toBe(0);
    }
    expect(count(html, "prd-search")).toBe(1);
  });

  it("version large : indicateurs et graphiques repérés ; seule la première carte porte les repères de carte", () => {
    const header = renderToStaticMarkup(
      <InventoryPremiumHeader total={2} inStock={2} lowStock={0} outOfStock={0} stockValue="100 MAD" categories={[]} onLowStock={noop} onOutOfStock={noop} />,
    );
    for (const t of ["prd-metrics", "prd-charts"]) expect(count(header, t), t).toBe(1);
    const card = (first: boolean, canWrite = true) =>
      renderToStaticMarkup(
        <ProductPremiumCard product={product("a")} selected={false} canWrite={canWrite} financeHidden={false} menuOpen={false} onSelect={noop} onMenu={noop} menu={null} tourFirst={first} />,
      );
    for (const t of ["prd-card", "prd-card-stock", "prd-card-prices", "prd-card-menu"]) expect(count(card(true), t), t).toBe(1);
    expect(card(false)).not.toContain("data-products-tour");
    expect(count(card(true, false), "prd-card-menu")).toBe(0);
  });

  it("fiche produit : repères des blocs ; actions d'écriture réservées au droit d'écriture, lien de lecture sinon", () => {
    const panel = (canWrite: boolean, financeHidden = false) =>
      renderToStaticMarkup(<ProductFocusPanel productId="a" fallback={product("a")} canWrite={canWrite} financeHidden={financeHidden} onEdit={noop} onIn={noop} onOut={noop} />);
    const write = panel(true);
    for (const t of ["prd-focus", "prd-focus-edit", "prd-focus-stock", "prd-focus-actions", "prd-focus-prices", "prd-focus-services", "prd-focus-movements"]) {
      expect(count(write, t), t).toBe(1);
    }
    const read = panel(false);
    expect(count(read, "prd-focus-edit")).toBe(0);
    expect(count(read, "prd-focus-actions")).toBe(1);
    expect(read).toContain("Voir les mouvements");
    expect(count(panel(true, true), "prd-focus-prices")).toBe(0);
  });

  it("formulaire : chaque champ réel est repéré ; en démonstration, l'enregistrement est désactivé", () => {
    const demo = renderToStaticMarkup(<ProductForm tutorialMode onSubmit={noop} onCancel={noop} />);
    for (const t of ["prd-form-name", "prd-form-purchase", "prd-form-sale", "prd-form-min", "prd-form-max", "prd-form-initial", "prd-form-supplier", "prd-form-save"]) {
      expect(count(demo, t), t).toBe(1);
    }
    expect(demo).toMatch(/<button[^>]*disabled=""[^>]*data-products-tour="prd-form-save"|<button[^>]*data-products-tour="prd-form-save"[^>]*disabled=""/);
    const normal = renderToStaticMarkup(<ProductForm onSubmit={noop} onCancel={noop} />);
    expect(normal).not.toMatch(/<button[^>]*disabled=""[^>]*data-products-tour="prd-form-save"|<button[^>]*data-products-tour="prd-form-save"[^>]*disabled=""/);
  });

  it("formulaire de modification : pas de champ Stock initial (réservé à la création)", () => {
    const edit = renderToStaticMarkup(<ProductForm initial={{ id: "p1", name: "Sérum" }} onSubmit={noop} onCancel={noop} />);
    expect(count(edit, "prd-form-initial")).toBe(0);
  });
});
