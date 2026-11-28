import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Page admin « Prospects » : balisage rendu côté serveur (pas de jsdom dans le projet) et helpers purs.
 * Données fictives uniquement (+212600000000, example.invalid). La mise en page réelle (zoom 0,8, 390/768/1280)
 * et les appels réseau ne sont pas couverts ici.
 */
import { ProspectCreatePanel, validateProspectForm } from "@/components/admin/prospects/prospect-create-panel";
import { ImportReport, ProspectsImportDialog } from "@/components/admin/prospects/prospects-import-dialog";
import { ProspectsCards, ProspectsPagination, ProspectsTable } from "@/components/admin/prospects/prospects-list";
import { ProspectsEmptyState, ProspectsLegalNote } from "@/components/admin/prospects/prospects-states";
import { ProspectsStats } from "@/components/admin/prospects/prospects-stats";
import { AdminProspectsView } from "@/components/admin/prospects/prospects-view";
import {
  EMPTY_PROSPECT_FILTERS,
  NOT_YET_AVAILABLE,
  buildProspectQuery,
  downloadProspectsExport,
  filenameFromDisposition,
  importFileExtension,
  importProspectsFile,
  importProspectsSheet,
  isGoogleSheetUrl,
  osmMapHref,
  osmObjectHref,
  prospectsExportHref,
  readFileAsBase64,
  safeWebsiteHref,
  telHref,
  whatsappHref,
  type Prospect,
  type ProspectListResponse,
} from "@/lib/admin/prospects-client";

const noop = () => {};

const prospect = (over: Partial<Prospect> = {}): Prospect => ({
  id: "p1",
  source: "OSM",
  sourceRef: "node/1",
  name: "Salon Exemple",
  category: "hairdresser",
  city: "Ville Test",
  address: "1 rue Exemple",
  latitude: 33.5,
  longitude: -7.6,
  phone: "+212600000000",
  email: "contact@example.invalid",
  website: "https://salon.example.invalid/",
  status: "TO_CONTACT",
  notes: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-02T10:00:00.000Z",
  ...over,
});

describe("appels d'import et de téléchargement (fetch simulé, aucune requête réelle)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const respond = (status: number, body: string, type = "text/html") =>
    vi.fn(async () => new Response(body, { status, headers: { "Content-Type": type } }));

  it("route absente (404 HTML) : message « pas encore disponible » pour l'import fichier, le lien et le téléchargement", async () => {
    const fetchMock = respond(404, "<html>Not found</html>");
    vi.stubGlobal("fetch", fetchMock);
    await expect(importProspectsFile({ filename: "a.xlsx", contentBase64: "UEs=" })).rejects.toMatchObject({ status: 404, message: NOT_YET_AVAILABLE });
    await expect(importProspectsSheet("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOp/edit")).rejects.toMatchObject({
      message: NOT_YET_AVAILABLE,
    });
    await expect(downloadProspectsExport(EMPTY_PROSPECT_FILTERS, "xlsx")).rejects.toMatchObject({ message: NOT_YET_AVAILABLE });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/admin/prospects/import-file/");
    expect(init).toMatchObject({ method: "POST", credentials: "include", cache: "no-store" });
    expect(JSON.parse(String(init.body))).toEqual({ filename: "a.xlsx", contentBase64: "UEs=" });
    expect((fetchMock.mock.calls[1] as unknown as [string])[0]).toBe("/api/admin/prospects/import-sheet/");
    expect((fetchMock.mock.calls[2] as unknown as [string])[0]).toBe("/api/admin/prospects/export.xlsx?sort=name");
  });

  it("feuille non partagée (422) : message du serveur, sinon message d'aide au partage", async () => {
    vi.stubGlobal("fetch", respond(422, JSON.stringify({ error: "La feuille n'est pas partagée." }), "application/json"));
    await expect(importProspectsSheet("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOp")).rejects.toMatchObject({
      status: 422,
      message: "La feuille n'est pas partagée.",
    });
    vi.stubGlobal("fetch", respond(422, "", "text/plain"));
    await expect(importProspectsSheet("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOp")).rejects.toMatchObject({
      message: expect.stringContaining("Toute personne disposant du lien"),
    });
  });

  it("nom du fichier téléchargé : Content-Disposition nettoyé, sinon nom par défaut", () => {
    expect(filenameFromDisposition('attachment; filename="prospects-2026.xlsx"', "prospects.xlsx")).toBe("prospects-2026.xlsx");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''prospects%20Maroc.csv", "prospects.csv")).toBe("prospects Maroc.csv");
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"', "prospects.csv")).toBe(".._.._etc_passwd");
    expect(filenameFromDisposition(null, "prospects.csv")).toBe("prospects.csv");
  });
});

describe("helpers prospects", () => {
  it("construit la requête de liste et l'export avec les mêmes filtres, sans pagination pour l'export", () => {
    const filters = { ...EMPTY_PROSPECT_FILTERS, search: "  salon ", city: "Ville Test", category: "barber" as const, has: "phone" as const };
    const query = new URLSearchParams(buildProspectQuery(filters, 3));
    expect(query.get("search")).toBe("salon");
    expect(query.get("city")).toBe("Ville Test");
    expect(query.get("category")).toBe("barber");
    expect(query.get("has")).toBe("phone");
    expect(query.get("page")).toBe("3");
    expect(query.get("pageSize")).toBe("50");
    expect(query.get("status")).toBeNull();

    const href = prospectsExportHref(filters);
    expect(href.startsWith("/api/admin/prospects/export.csv?")).toBe(true);
    const exportQuery = new URLSearchParams(href.split("?")[1]);
    expect(exportQuery.get("city")).toBe("Ville Test");
    expect(exportQuery.get("sort")).toBe("name");
    expect(exportQuery.has("page")).toBe(false);
    expect(exportQuery.has("pageSize")).toBe(false);
    expect(prospectsExportHref(filters, "xlsx")).toBe(href.replace("export.csv", "export.xlsx"));
    expect(prospectsExportHref(EMPTY_PROSPECT_FILTERS, "xlsx")).toBe("/api/admin/prospects/export.xlsx?sort=name");
  });

  it("import : extensions, lien Google Sheets et base64", async () => {
    expect(importFileExtension("prospects.XLSX")).toBe(".xlsx");
    expect(importFileExtension("liste.csv")).toBe(".csv");
    expect(importFileExtension("liste.xls")).toBeNull();
    expect(importFileExtension("liste.csv.exe")).toBeNull();
    expect(isGoogleSheetUrl("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOp/edit#gid=0")).toBe(true);
    expect(isGoogleSheetUrl("http://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOp/edit")).toBe(false);
    expect(isGoogleSheetUrl("https://docs.google.com.example.invalid/spreadsheets/d/1AbCdEfGhIjKlMnOp")).toBe(false);
    expect(isGoogleSheetUrl("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp")).toBe(false);
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256);
    const b64 = await readFileAsBase64(new Blob([bytes]));
    expect(Buffer.from(b64, "base64").equals(Buffer.from(bytes))).toBe(true);
  });

  it("WhatsApp ouvre seulement la conversation (aucun texte prérempli)", () => {
    expect(whatsappHref("+212600000000")).toBe("https://wa.me/212600000000");
    expect(whatsappHref("0600000000")).toBe("https://wa.me/212600000000");
    expect(whatsappHref(null)).toBeNull();
    expect(whatsappHref("12")).toBeNull();
    expect(telHref("+212600000000")).toBe("tel:+212600000000");
  });

  it("n'accepte que des sites http(s) et des coordonnées valides", () => {
    expect(safeWebsiteHref("javascript:alert(1)")).toBeNull();
    expect(safeWebsiteHref("data:text/html,x")).toBeNull();
    expect(safeWebsiteHref("salon.example.invalid")).toBe("https://salon.example.invalid/");
    expect(safeWebsiteHref("http://salon.example.invalid/page")).toBe("http://salon.example.invalid/page");
    expect(osmMapHref(33.5, -7.6)).toBe("https://www.openstreetmap.org/?mlat=33.5&mlon=-7.6#map=18/33.5/-7.6");
    expect(osmMapHref(0, 0)).toBe("https://www.openstreetmap.org/?mlat=0&mlon=0#map=18/0/0");
    expect(osmMapHref(null, -7.6)).toBeNull();
    expect(osmMapHref(Number.NaN, 1)).toBeNull();
    expect(osmMapHref(120, 1)).toBeNull();
    expect(osmObjectHref("way/42")).toBe("https://www.openstreetmap.org/way/42");
    expect(osmObjectHref("autre")).toBeNull();
  });

  it("valide le formulaire d'ajout manuel", () => {
    const base = { name: "", category: "beauty", city: "", address: "", phone: "", email: "", website: "" };
    expect(validateProspectForm(base).name).toBeTruthy();
    const errs = validateProspectForm({ ...base, name: "Salon", phone: "12", email: "pas-un-mail", website: "javascript:alert(1)" });
    expect(errs.name).toBeUndefined();
    expect(errs.phone).toBeTruthy();
    expect(errs.email).toBeTruthy();
    expect(errs.website).toBeTruthy();
    expect(validateProspectForm({ ...base, name: "Salon", phone: "06 00 00 00 00", website: "salon.example.invalid" })).toEqual({});
  });
});

describe("balisage de la page Prospects", () => {
  const items = [
    prospect(),
    prospect({
      id: "p2",
      source: "CSV",
      sourceRef: null,
      name: "Institut Fictif",
      category: "beauty",
      latitude: null,
      longitude: null,
      phone: null,
      email: null,
      website: "javascript:alert(1)",
      status: "CONTACTED",
      notes: "Rappeler plus tard",
    }),
  ];

  it("tableau et cartes : liens tel:, WhatsApp sans texte, mailto:, site externe sûr, carte OSM", () => {
    for (const html of [
      renderToStaticMarkup(<ProspectsTable items={items} savingIds={new Set()} onStatusChange={noop} onOpenDetails={noop} />),
      renderToStaticMarkup(<ProspectsCards items={items} savingIds={new Set()} onStatusChange={noop} onOpenDetails={noop} />),
    ]) {
      expect(html).toContain('href="tel:+212600000000"');
      expect(html).toContain('href="https://wa.me/212600000000"');
      expect(html).not.toContain("text=");
      expect(html).toContain('href="mailto:contact@example.invalid"');
      expect(html).toContain('href="https://salon.example.invalid/"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('href="https://www.openstreetmap.org/?mlat=33.5&amp;mlon=-7.6#map=18/33.5/-7.6"');
      // Lien non sûr affiché en texte, jamais en href.
      expect(html).not.toContain('href="javascript:');
      expect(html).toContain("javascript:alert(1)");
      expect(html).toContain("Coiffure");
      expect(html).toContain("Institut de beauté");
      expect(html).toContain('aria-label="Statut de Salon Exemple"');
      expect(html).toContain("Rappeler plus tard");
    }
  });

  it("mentions ODbL et loi 09-08 visibles", () => {
    const html = renderToStaticMarkup(<ProspectsLegalNote />);
    expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
    expect(html).toContain("contributeurs OpenStreetMap");
    expect(html).toContain("(ODbL)");
    expect(html).toContain("loi 09-08 impose le consentement préalable");
    expect(html).toContain("droit d&#x27;opposition");
  });

  it("état vide : invite à synchroniser OSM ou importer un CSV", () => {
    const html = renderToStaticMarkup(<ProspectsEmptyState onSync={noop} onImport={noop} onCreate={noop} />);
    expect(html).toContain("Aucun prospect pour l&#x27;instant");
    expect(html).toContain("Synchroniser OpenStreetMap");
    expect(html).toContain("Importer un fichier");
  });

  it("dialogue d'import : deux onglets accessibles, étapes Google Sheets et avertissement de partage", () => {
    const html = renderToStaticMarkup(<ProspectsImportDialog onClose={noop} onImported={noop} />);
    expect(html).toContain('role="tablist"');
    expect(html.split('role="tab"').length - 1).toBe(2);
    expect(html).toContain("Fichier .xlsx ou .csv");
    expect(html).toContain("Lien Google Sheets");
    expect(html).toContain('aria-selected="true"');
    expect(html.split('role="tabpanel"').length - 1).toBe(2);
    expect(html).toContain('accept=".xlsx,.csv,');
    expect(html).toContain("Nouveau → Importer le fichier");
    expect(html).toContain("Fichier → Télécharger → Microsoft Excel (.xlsx)");
    expect(html).toContain("Toute personne disposant du lien");
    expect(html).toContain("toute personne qui a le lien peut alors voir les coordonnées");
    expect(html).toContain('href="https://sheets.new"');
  });

  it("compteurs et filtres rapides", () => {
    const html = renderToStaticMarkup(
      <ProspectsStats
        stats={{ total: 1234, withPhone: 600, withEmail: 50, withWebsite: 20, byStatus: { TO_CONTACT: 1200, CONTACTED: 30, CUSTOMER: 3, DECLINED: 1 } }}
        activeHas="phone"
        activeStatus=""
        onHas={noop}
        onStatus={noop}
      />,
    );
    expect(html).toMatch(/1\s234/);
    expect(html).toContain("Avec téléphone");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("À contacter");
    expect(html).toContain("Refusé");
  });

  it("pagination et rapport d'import plafonné", () => {
    const nav = renderToStaticMarkup(<ProspectsPagination page={2} pageSize={50} total={120} onPage={noop} />);
    expect(nav).toContain("Page 2 / 3");
    expect(renderToStaticMarkup(<ProspectsPagination page={1} pageSize={50} total={10} onPage={noop} />)).toBe("");

    const errors = Array.from({ length: 60 }, (_, i) => ({ line: i + 2, error: "Nom manquant" }));
    const report = renderToStaticMarkup(<ImportReport result={{ inserted: 3, updated: 1, unchanged: 7, skipped: 60, errors }} />);
    expect(report).toContain("inchangés");
    expect(report).toContain("60 lignes en erreur");
    expect(report).toContain("Ligne 2");
    expect(report).not.toContain("Ligne 61<");
    expect(report).toContain("et 10 autre(s) ligne(s)");
  });

  it("la vue complète se rend côté serveur (squelette de chargement + mentions)", () => {
    const html = renderToStaticMarkup(<AdminProspectsView />);
    expect(html).toContain("<h1");
    expect(html).toContain("Prospects");
    expect(html).toContain("Chargement des prospects");
    expect(html).toContain("Synchroniser OpenStreetMap");
    expect(html).toContain(">Importer<");
    expect(html).toContain("Ajouter un prospect");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("Télécharger");
    expect(html).toContain("(ODbL)");
    // Le panneau d'ajout (portail) ne rend rien avant montage côté client.
    expect(renderToStaticMarkup(<ProspectCreatePanel open onClose={noop} onCreated={noop} />)).toBe("");
  });

  const response = (over: Partial<ProspectListResponse> = {}): ProspectListResponse => ({
    items,
    total: 120,
    page: 1,
    pageSize: 50,
    cities: [{ city: "Ville Test", count: 120 }],
    stats: { total: 120, withPhone: 80, withEmail: 10, withWebsite: 5, byStatus: { TO_CONTACT: 100, CONTACTED: 15, CUSTOMER: 4, DECLINED: 1 } },
    lastSyncedAt: null,
    ...over,
  });

  it("vue remplie : compteurs, filtres, tableau + cartes, pagination, export avec filtres", () => {
    const html = renderToStaticMarkup(<AdminProspectsView initialData={response()} />);
    expect(html).toContain("Dernière synchronisation OpenStreetMap");
    expect(html).toContain("jamais");
    expect(html).toContain('id="prospects-search"');
    expect(html).toContain("Ville Test (120)");
    expect(html).toContain("<table");
    expect(html).toContain('aria-label="Liste des prospects"');
    expect(html).toContain("Page 1 / 3");
    expect(html).not.toContain("Chargement des prospects");
  });

  it("vue sans aucune fiche : état vide au lieu des filtres", () => {
    const empty = response({
      items: [],
      total: 0,
      cities: [],
      stats: { total: 0, withPhone: 0, withEmail: 0, withWebsite: 0, byStatus: { TO_CONTACT: 0, CONTACTED: 0, CUSTOMER: 0, DECLINED: 0 } },
    });
    const html = renderToStaticMarkup(<AdminProspectsView initialData={empty} />);
    expect(html).toContain("Aucun prospect pour l&#x27;instant");
    expect(html).not.toContain('id="prospects-search"');
    expect(html).toMatch(/aria-haspopup="menu"[^>]*disabled=""/);
  });
});
