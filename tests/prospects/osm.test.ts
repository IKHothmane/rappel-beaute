import { describe, expect, it, vi } from "vitest";
import {
  OVERPASS_URL,
  OVERPASS_USER_AGENT,
  OverpassError,
  buildOverpassQuery,
  categorize,
  fetchOsmProspects,
  fetchOverpassElements,
  osmAddress,
  parseOverpassElements,
  type FetchLike,
  type OverpassElement,
} from "@/lib/prospects/osm";

/** Réponse Overpass SIMULÉE : commerces et localités inventés, coordonnées arbitraires. */
const ELEMENTS: OverpassElement[] = [
  { type: "node", id: 1001, lat: 33.0, lon: -7.0, tags: { place: "city", name: "Alpha ⴰⵍⴼⴰ ألفا", "name:fr": "Alpha" } },
  { type: "node", id: 1002, lat: 33.3, lon: -7.3, tags: { place: "village", name: "Douar Beta دوار" } },
  { type: "way", id: 1003, center: { lat: 31.0, lon: -8.0 }, tags: { place: "town", name: "ⴳⴰⵎⴰ Gamma غاما" } },
  {
    type: "node", id: 2001, lat: 33.01, lon: -7.01,
    tags: {
      shop: "hairdresser", name: "Salon Test A", "addr:city": "VILLE ALPHA الفا",
      "addr:street": "Rue Test", "addr:housenumber": "12", "addr:postcode": "20000",
      phone: "+212 6 00 00 00 01;+212 5 22 00 00 01", email: "Contact@Salon-Test-A.example", website: "salon-test-a.example",
    },
  },
  {
    type: "node", id: 2002, lat: 33.29, lon: -7.29,
    tags: { shop: "hairdresser", hairdresser: "barber", name: "Coupe Test B", "addr:city": "مدينة", "contact:phone": "0600000002" },
  },
  { type: "way", id: 2003, center: { lat: 31.01, lon: -8.01 }, tags: { shop: "beauty", beauty: "nails;waxing", name: "Ongles Test C", url: "javascript:alert(1)", "contact:website": "https://ongles-test-c.example" } },
  { type: "node", id: 2004, lat: 31.02, lon: -8.02, tags: { amenity: "spa", name: "Spa Test D", phone: "12", "contact:email": "pas-un-email;d@spa-test.example" } },
  { type: "node", id: 2005, lat: 31.03, lon: -8.03, tags: { shop: "beauty" } },
  { type: "node", id: 2006, lat: 20.0, lon: -15.0, tags: { shop: "massage", name: "Massage Test E" } },
  { type: "relation", id: 2007, tags: { leisure: "spa", name: "Hammam Test F", "addr:city": "Ville Zeta" } },
  { type: "node", id: 2001, lat: 33.01, lon: -7.01, tags: { shop: "hairdresser", name: "Salon Test A" } },
  { type: "node", id: 3001, lat: 33.0, lon: -7.0, tags: { amenity: "cafe", name: "Café Test" } },
];

describe("catégorie OSM", () => {
  it.each([
    [{ shop: "hairdresser" }, "hairdresser"],
    [{ shop: "hairdresser", hairdresser: "barber" }, "barber"],
    [{ shop: "hairdresser", hairdresser: "unisex;barber" }, "barber"],
    [{ shop: "hairdresser", male: "yes" }, "barber"],
    [{ shop: "hairdresser", name: "Barber Shop Test" }, "barber"],
    [{ shop: "hairdresser", name: "Barbier Test" }, "barber"],
    [{ shop: "beauty" }, "beauty"],
    [{ shop: "beauty", beauty: "nails" }, "nails"],
    [{ shop: "nail_salon" }, "nails"],
    [{ shop: "cosmetics" }, "cosmetics"],
    [{ shop: "massage" }, "massage"],
    [{ amenity: "spa" }, "spa"],
    [{ leisure: "spa" }, "spa"],
    [{ beauty: "skin_care" }, "beauty"],
    [{ beauty: "nails" }, "nails"],
    [{ shop: "chemist" }, "other"],
  ])("%o → %s", (tags, expected) => {
    expect(categorize(tags)).toBe(expected);
  });
});

describe("analyse d'une réponse Overpass simulée", () => {
  const { rows, stats } = parseOverpassElements(ELEMENTS);
  const byRef = Object.fromEntries(rows.map((row) => [row.sourceRef, row]));

  it("ignore les éléments sans nom, hors prospection et les doublons", () => {
    expect(rows.map((r) => r.sourceRef).sort()).toEqual(["node/2001", "node/2002", "node/2004", "node/2006", "relation/2007", "way/2003"]);
    expect(stats).toMatchObject({ places: 3, prospectElements: 8, named: 6, unnamed: 1 });
  });

  it("normalise téléphone, e-mail, site, adresse et catégorie", () => {
    expect(byRef["node/2001"]).toMatchObject({
      name: "Salon Test A", category: "hairdresser", city: "Ville Alpha", address: "12 Rue Test, 20000",
      phone: "+212600000001", email: "contact@salon-test-a.example", website: "https://salon-test-a.example/",
      latitude: 33.01, longitude: -7.01,
    });
    expect(byRef["node/2002"]).toMatchObject({ category: "barber", phone: "+212600000002" });
    expect(byRef["way/2003"]).toMatchObject({ category: "nails", website: "https://ongles-test-c.example/", latitude: 31.01, longitude: -8.01 });
    expect(byRef["node/2004"]).toMatchObject({ category: "spa", phone: null, email: "d@spa-test.example" });
  });

  it("rattache à la localité la plus proche quand addr:city manque ou n'a pas de partie latine", () => {
    expect(byRef["node/2002"].city).toBe("Douar Beta");
    expect(byRef["way/2003"].city).toBe("Gamma");
    expect(byRef["node/2004"].city).toBe("Gamma");
    // Trop loin de toute localité : pas de ville inventée.
    expect(byRef["node/2006"].city).toBeNull();
    // Sans coordonnées : addr:city conservée.
    expect(byRef["relation/2007"]).toMatchObject({ city: "Ville Zeta", latitude: null, longitude: null });
    expect(stats).toMatchObject({ cityFromAddress: 2, cityFromNearest: 3, withoutCity: 1, withPhone: 2, withEmail: 2, withWebsite: 2 });
  });

  it("adresse : rue + numéro + code postal, sinon addr:full, sinon rien", () => {
    expect(osmAddress({ "addr:street": "Avenue Test" })).toBe("Avenue Test");
    expect(osmAddress({ "addr:full": "Résidence Test, étage 2", "addr:postcode": "10000" })).toBe("Résidence Test, étage 2, 10000");
    expect(osmAddress({ "addr:housenumber": "5", "addr:postcode": "10000" })).toBeNull();
  });
});

describe("appel Overpass (fetch simulé, aucun réseau)", () => {
  const ok = (body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...headers } });

  it("envoie la requête fixe en POST avec un User-Agent générique", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => ok({ elements: ELEMENTS }));
    const result = await fetchOsmProspects({ fetchImpl });
    expect(result.rows).toHaveLength(6);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(OVERPASS_URL);
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe(OVERPASS_USER_AGENT);
    expect(OVERPASS_USER_AGENT).toBe("rappel-beauty-prospects/1.0");
    const data = new URLSearchParams(String(init.body)).get("data") ?? "";
    expect(data).toBe(buildOverpassQuery());
    expect(data).toContain('area["ISO3166-1"="MA"][admin_level=2]');
    expect(data).toContain('nwr["shop"~"^(beauty|hairdresser|cosmetics|massage|nail_salon)$"](area.ma)');
    expect(data).toContain('nwr["amenity"="spa"](area.ma)');
    expect(data).toContain('nwr["leisure"="spa"](area.ma)');
    expect(data).toContain('nwr["beauty"](area.ma)');
    expect(data).toContain('nwr["place"~"^(city|town|village)$"](area.ma)');
  });

  it("échoue proprement : statut HTTP, remarque d'erreur, JSON invalide, taille, délai", async () => {
    const expectKind = async (fetchImpl: FetchLike, kind: OverpassError["kind"], extra: { timeoutMs?: number; maxBytes?: number } = {}) => {
      const error = await fetchOverpassElements({ fetchImpl, ...extra }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(OverpassError);
      expect((error as OverpassError).kind).toBe(kind);
    };
    await expectKind(async () => new Response("Too Many Requests", { status: 429 }), "http");
    await expectKind(async () => ok({ elements: [], remark: "runtime error: Query timed out in \"query\" at line 4 after 141 seconds." }), "remark");
    await expectKind(async () => new Response("<html>", { status: 200 }), "invalid");
    await expectKind(async () => ok({ foo: 1 }), "invalid");
    await expectKind(async () => ok({ elements: [] }, { "content-length": "999999999" }), "too_large");
    await expectKind(async () => ok({ elements: ELEMENTS }), "too_large", { maxBytes: 100 });
    await expectKind(async () => {
      throw new TypeError("fetch failed");
    }, "network");
    await expectKind(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
      "timeout",
      { timeoutMs: 20 },
    );
  });
});
