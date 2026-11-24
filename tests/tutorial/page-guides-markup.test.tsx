import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Balisage rendu côté serveur (le projet n'embarque pas jsdom) : les repères des visites Services et Ressources
 * existent dans les versions mobile et large, seule la première carte les porte, et l'accès en lecture seule ne rend
 * aucune action d'écriture ciblée. La mise en page réelle (zoom 0,8, 1280/768/390) n'est pas couverte ici.
 */
vi.mock("@/components/agenda/staff-color-provider", () => ({ useStaffPalette: () => [] }));
vi.mock("@/components/services/service-responsive-image", () => ({ ServiceResponsiveImage: () => null }));

import ServicesCatalogPremium from "@/components/services/services-catalog-premium";
import { ServicesMobile } from "@/components/services/services-mobile";
import { ResourcesMobile } from "@/components/resources/resources-mobile";
import { ResourcesPremiumHeader } from "@/components/resources/resources-premium-header";
import { ResourcePremiumCard } from "@/components/resources/resource-premium-card";
import { ResourceForm } from "@/components/resources/resource-form";
import { ServiceForm } from "@/components/services/service-form";
import type { ResourceListItem } from "@/types/resource";
import type { ServiceListItem } from "@/types/service";

const service = (id: string): ServiceListItem =>
  ({ id, name: `Soin ${id}`, description: null, category: "Visage", durationMin: 60, price: 300, active: true, imageUrl: null, staffNames: ["Salma Idrissi"] }) as unknown as ServiceListItem;
const resource = (id: string): ResourceListItem =>
  ({ id, name: `Cabine ${id}`, type: "CABINE", active: true, location: null, notes: null, capacity: 1, imageUrl: null, serviceCount: 2, serviceNames: [], upcomingMaintenance: null }) as unknown as ResourceListItem;

const count = (html: string, attr: string, value: string) => html.split(`${attr}="${value}"`).length - 1;
const noop = () => {};

describe("page Services : repères du balisage", () => {
  const desktop = (canWrite: boolean, services = [service("a"), service("b")]) =>
    renderToStaticMarkup(
      <ServicesCatalogPremium services={services} canWrite={canWrite} onCreate={noop} onEdit={noop} guide={<span id="guide" />} />,
    );
  const mobile = (canWrite: boolean, filtered = [service("a"), service("b")]) =>
    renderToStaticMarkup(
      <ServicesMobile
        orgName="Institut" catalogCount={filtered.length} activeCount={filtered.length} inactiveCount={0} canWrite={canWrite}
        financeHidden={false} overview={null} insight="" searchInput="" onSearchChange={noop}
        searchRef={{ current: null }} activeFilter="all" onActiveFilterChange={noop} filtered={filtered}
        statsById={new Map()} loading={false} topByAppointments={null} menuId={null} onMenu={noop} onCreate={noop}
        onEdit={noop} onToggle={noop} onDelete={noop} guide={<span id="guide" />}
      />,
    );

  it("version large : tous les repères de page, seule la première carte porte les repères de carte", () => {
    const html = desktop(true);
    for (const t of ["svc-intro", "svc-metrics", "svc-search", "svc-categories", "svc-list", "svc-add"]) {
      expect(count(html, "data-services-tour", t), t).toBe(1);
    }
    for (const t of ["svc-card", "svc-card-status", "svc-card-meta", "svc-card-staff", "svc-card-edit", "svc-card-menu"]) {
      expect(count(html, "data-services-tour", t), t).toBe(1);
    }
    expect(html).toContain('data-tour="services-add"');
    expect(html).toContain('id="guide"');
  });

  it("version mobile : mêmes repères, filtres par état, bouton Tutoriel présent même sans droit d'écriture", () => {
    const html = mobile(true);
    for (const t of ["svc-intro", "svc-metrics", "svc-search", "svc-status", "svc-list", "svc-add", "svc-card", "svc-card-status", "svc-card-meta", "svc-card-staff", "svc-card-edit", "svc-card-menu"]) {
      expect(count(html, "data-services-tour", t), t).toBe(1);
    }
    expect(html).toContain('data-tour="services-add"');
    const readOnly = mobile(false);
    expect(readOnly).toContain('id="guide"');
    for (const t of ["svc-add", "svc-card-menu", "svc-card-edit"]) expect(count(readOnly, "data-services-tour", t), t).toBe(0);
  });

  it("liste vide : aucun repère de carte ni de liste, le bouton Tutoriel reste proposé", () => {
    for (const html of [desktop(true, []), mobile(true, [])]) {
      for (const t of ["svc-list", "svc-card", "svc-card-status"]) expect(count(html, "data-services-tour", t), t).toBe(0);
      expect(html).toContain('id="guide"');
    }
  });

  it("lecture seule (grand écran) : la carte reste ciblable via le bouton « Lecture seule », sans menu d'actions", () => {
    const html = desktop(false);
    expect(count(html, "data-services-tour", "svc-card-edit")).toBe(1);
    expect(count(html, "data-services-tour", "svc-card-menu")).toBe(0);
    expect(count(html, "data-services-tour", "svc-add")).toBe(0);
    expect(html).toContain("Lecture seule");
  });

  it("formulaire : chaque champ réel est repéré ; en démonstration, l'enregistrement est désactivé", () => {
    const options = { staff: [], products: [] } as never;
    const html = renderToStaticMarkup(<ServiceForm initial={{ active: true }} options={options} onSubmit={noop} onCancel={noop} tutorialMode />);
    for (const t of ["svc-form-name", "svc-form-description", "svc-form-price", "svc-form-duration", "svc-form-staff", "svc-form-products", "svc-form-status", "svc-form-save"]) {
      expect(count(html, "data-services-tour", t), t).toBe(1);
    }
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-services-tour="svc-form-save"|<button[^>]*data-services-tour="svc-form-save"[^>]*disabled=""/);
    const normal = renderToStaticMarkup(<ServiceForm initial={{ active: true }} options={options} onSubmit={noop} onCancel={noop} />);
    expect(normal).not.toMatch(/<button[^>]*disabled=""[^>]*data-services-tour="svc-form-save"/);
  });
});

describe("page Ressources : repères du balisage", () => {
  const mobile = (canWrite: boolean, filtered = [resource("a"), resource("b")]) =>
    renderToStaticMarkup(
      <ResourcesMobile
        orgName="Institut" catalogCount={filtered.length} activeCount={filtered.length} availableCount={filtered.length}
        occupiedCount={0} maintenanceCount={0} canWrite={canWrite} financeHidden={false} overview={null} insight=""
        searchInput="" onSearchChange={noop} searchRef={{ current: null }} typeFilter="" onTypeFilter={noop}
        typeCounts={[["CABINE", filtered.length]]} filtered={filtered} loading={false} selectedId={null}
        onSelect={noop} selected={null} currentOf={() => undefined} nextOf={() => undefined} todayCountOf={() => 0}
        menuId={null} onMenu={noop} onCreate={noop} onEdit={noop} onToggle={noop} onDelete={noop} onMaintenance={noop}
        guide={<span id="guide" />}
      />,
    );

  it("version mobile : repères de page et de première carte, bouton Maintenance réservé à l'écriture", () => {
    const html = mobile(true);
    for (const t of ["res-intro", "res-add", "res-maintenance", "res-collision", "res-metrics", "res-search", "res-filters", "res-list", "res-card", "res-card-status", "res-card-edit"]) {
      expect(count(html, "data-resources-tour", t), t).toBe(1);
    }
    expect(html).toContain('data-tour="resources-add"');
    const readOnly = mobile(false);
    expect(readOnly).toContain('id="guide"');
    for (const t of ["res-add", "res-maintenance", "res-card-edit"]) expect(count(readOnly, "data-resources-tour", t), t).toBe(0);
  });

  it("liste vide : aucun repère de liste ni de carte", () => {
    const html = mobile(true, []);
    for (const t of ["res-list", "res-card", "res-card-status", "res-card-edit"]) expect(count(html, "data-resources-tour", t), t).toBe(0);
  });

  it("version large : en-tête (introduction, bouton, indicateurs) et carte", () => {
    const header = renderToStaticMarkup(
      <ResourcesPremiumHeader total={2} available={2} occupied={0} maintenance={0} canWrite onCreate={noop} guide={<span id="guide" />} />,
    );
    for (const t of ["res-intro", "res-add", "res-metrics"]) expect(count(header, "data-resources-tour", t), t).toBe(1);
    expect(header).toContain('data-tour="resources-add"');
    const first = renderToStaticMarkup(
      <ResourcePremiumCard resource={resource("a")} status="available" selected={false} canWrite tourFirst onSelect={noop} onEdit={noop} />,
    );
    for (const t of ["res-card", "res-card-status", "res-card-edit"]) expect(count(first, "data-resources-tour", t), t).toBe(1);
    const other = renderToStaticMarkup(
      <ResourcePremiumCard resource={resource("b")} status="available" selected={false} canWrite onSelect={noop} onEdit={noop} />,
    );
    expect(other).not.toContain("data-resources-tour");
  });

  it("formulaire : champs réels repérés, prestations associées seulement s'il y en a, enregistrement désactivé en démonstration", () => {
    const withServices = renderToStaticMarkup(
      <ResourceForm services={[{ id: "s1", name: "Soin" }]} onSubmit={noop} onCancel={noop} tutorialMode />,
    );
    for (const t of ["res-form-name", "res-form-type", "res-form-services", "res-form-save"]) {
      expect(count(withServices, "data-resources-tour", t), t).toBe(1);
    }
    expect(withServices).toMatch(/<button[^>]*disabled=""[^>]*data-resources-tour="res-form-save"|<button[^>]*data-resources-tour="res-form-save"[^>]*disabled=""/);
    const without = renderToStaticMarkup(<ResourceForm services={[]} onSubmit={noop} onCancel={noop} tutorialMode />);
    expect(count(without, "data-resources-tour", "res-form-services")).toBe(0);
  });
});
