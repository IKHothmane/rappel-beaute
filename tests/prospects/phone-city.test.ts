import { describe, expect, it } from "vitest";
import { normalizeMoroccanPhone, pickMoroccanPhone } from "@/lib/prospects/phone";
import { CityIndex, cleanCityValue, cleanPlaceName, haversineKm, latinPart, tidyCityCase } from "@/lib/prospects/city";

describe("téléphone marocain E.164", () => {
  it.each([
    ["0600000001", "+212600000001"],
    ["06 00 00 00 02", "+212600000002"],
    ["06.00.00.00.03", "+212600000003"],
    ["+212 6 00 00 00 04", "+212600000004"],
    ["+212 (0) 6 00 00 00 05", "+212600000005"],
    ["+212 0600000006", "+212600000006"],
    ["00212700000007", "+212700000007"],
    ["212500000008", "+212500000008"],
    ["0522-00-00-09", "+212522000009"],
    ["'+212600000010", "+212600000010"],
    ["+212 6 00 00 00 11 poste 12", "+212600000011"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeMoroccanPhone(raw)).toBe(expected);
  });

  it.each(["", "abc", "12345", "+33 6 00 00 00 00", "0033600000000", "0400000000", "+212 4 00 00 00 00", "06000000001234"])(
    "refuse %j",
    (raw) => {
      expect(normalizeMoroccanPhone(raw)).toBeNull();
    },
  );

  it("prend le premier numéro valide d'une liste ou d'une étiquette multiple", () => {
    expect(pickMoroccanPhone([undefined, "n/a", "0522000001;0600000002"])).toBe("+212522000001");
    expect(pickMoroccanPhone(["+33 1 00 00 00 00 / 06 00 00 00 03"])).toBe("+212600000003");
    expect(pickMoroccanPhone(["05 22 00 00 04 ou 06 00 00 00 05"])).toBe("+212522000004");
    expect(pickMoroccanPhone([42, null, "invalide"])).toBeNull();
  });
});

describe("noms de villes multilingues", () => {
  it("garde la partie latine", () => {
    expect(latinPart("Agadir ⴰⴳⴰⴷⵉⵔ أگادير")).toBe("Agadir");
    expect(latinPart("ⵜⵉⵖⵔⵎⵜ Ville Test ville")).toBe("Ville Test ville");
    expect(latinPart("Ksar Test القصر")).toBe("Ksar Test");
    expect(latinPart("Fès فاس")).toBe("Fès");
    expect(latinPart("M'diq Test المضيق")).toBe("M'diq Test");
    expect(latinPart("Ville Alpha - مدينة")).toBe("Ville Alpha");
    expect(latinPart("مدينة (Ville Beta)")).toBe("Ville Beta");
  });

  it("renvoie null sans lettre latine", () => {
    expect(latinPart("الدار البيضاء")).toBeNull();
    expect(latinPart("ⴰⴳⴰⴷⵉⵔ")).toBeNull();
    expect(latinPart(undefined)).toBeNull();
  });

  it("préfère name:fr, puis la partie latine de name, puis name:en, puis name tel quel", () => {
    expect(cleanPlaceName({ name: "Alpha ⴰⵍⴼⴰ ألفا", "name:fr": "Alpha-Ville" })).toBe("Alpha-Ville");
    expect(cleanPlaceName({ name: "Beta ⴱⴻⵜⴰ بيتا" })).toBe("Beta");
    expect(cleanPlaceName({ name: "غاما", "name:en": "Gamma" })).toBe("Gamma");
    expect(cleanPlaceName({ name: "غاما" })).toBe("غاما");
    expect(cleanPlaceName({})).toBeNull();
  });

  it("normalise la casse d'une ville saisie tout en majuscules ou minuscules", () => {
    expect(tidyCityCase("VILLE ALPHA")).toBe("Ville Alpha");
    expect(tidyCityCase("el ville-beta")).toBe("El Ville-Beta");
    expect(tidyCityCase("Ville deLta")).toBe("Ville deLta");
    expect(cleanCityValue("  VILLE   GAMMA مدينة ")).toBe("Ville Gamma");
    expect(cleanCityValue("مدينة")).toBe("مدينة");
  });
});

describe("ville la plus proche", () => {
  const index = new CityIndex([
    { name: "Ville Alpha", lat: 33.0, lon: -7.0, weight: 3 },
    { name: "Douar Beta", lat: 33.05, lon: -7.25, weight: 1 },
    { name: "Bourg Gamma", lat: 31.0, lon: -8.0, weight: 1.5 },
  ]);

  it("haversine : 1° de latitude ≈ 111 km", () => {
    expect(haversineKm(33, -7, 34, -7)).toBeGreaterThan(110);
    expect(haversineKm(33, -7, 34, -7)).toBeLessThan(112);
  });

  it("rattache à la localité la plus proche", () => {
    expect(index.nearest(31.01, -8.01)?.name).toBe("Bourg Gamma");
    expect(index.nearest(33.05, -7.24)?.name).toBe("Douar Beta");
  });

  it("pondère par l'importance : la grande ville l'emporte sur un douar à peine plus proche", () => {
    // ~13 km de Ville Alpha (poids 3), ~10 km de Douar Beta (poids 1).
    expect(index.nearest(33.03, -7.14)?.name).toBe("Ville Alpha");
  });

  it("n'attribue rien au-delà de 50 km", () => {
    expect(index.nearest(29.0, -10.0)).toBeNull();
    expect(new CityIndex([]).nearest(33, -7)).toBeNull();
  });
});
