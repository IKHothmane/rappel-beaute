import { describe, expect, it } from "vitest";
import {
  CsvFormatError,
  csvCell,
  detectSeparator,
  mapCsvHeaders,
  nameCityRef,
  parseCsv,
  planCsvImport,
  prospectsToCsv,
} from "@/lib/prospects/csv";
import type { ProspectDto } from "@/lib/prospects/types";

describe("lecture CSV", () => {
  it("détecte « ; » ou « , » sur l'en-tête, hors guillemets", () => {
    expect(detectSeparator("nom;ville\na,b;c")).toBe(";");
    expect(detectSeparator("nom,ville\nx;y;z")).toBe(",");
    expect(detectSeparator('"a;b;c",ville\n')).toBe(",");
  });

  it("gère BOM, guillemets doublés, séparateur et retour à la ligne entre guillemets, CRLF", () => {
    const text = '﻿nom;notes\r\n"Salon ""Test"" A";"ligne 1\r\nligne 2"\r\n"Salon; B";x\r\n';
    const records = parseCsv(text);
    expect(records).toEqual([
      { line: 1, cells: ["nom", "notes"] },
      { line: 2, cells: ['Salon "Test" A', "ligne 1\r\nligne 2"] },
      { line: 4, cells: ["Salon; B", "x"] },
    ]);
  });

  it("ignore les lignes vides et refuse un guillemet non fermé", () => {
    expect(parseCsv("nom\n\nSalon A\n\n").map((r) => r.cells)).toEqual([["nom"], ["Salon A"]]);
    expect(() => parseCsv('nom\n"Salon A\n')).toThrow(CsvFormatError);
  });

  it("reconnaît les en-têtes français et anglais sans tenir compte de la casse ni des accents", () => {
    expect(mapCsvHeaders(["NOM", "Catégorie", "Ville", "Adresse", "Téléphone", "E-mail", "Site web"])).toEqual({
      name: 0, category: 1, city: 2, address: 3, phone: 4, email: 5, website: 6,
    });
    expect(mapCsvHeaders(["name", "category", "city", "address", "tel", "email", "website"])).toEqual({
      name: 0, category: 1, city: 2, address: 3, phone: 4, email: 5, website: 6,
    });
  });
});

describe("plan d'import CSV", () => {
  it("normalise, dédoublonne par téléphone puis par nom + ville, et liste les lignes ignorées", () => {
    const csv = [
      "Nom;Catégorie;Ville;Téléphone;Email;Site",
      "Salon Test A;coiffeur;VILLE ALPHA;06 00 00 00 01;contact@salon-test-a.example;www.salon-test-a.example",
      "Salon Test A bis;barbier;Ville Alpha;+212600000001;;",
      "Institut Test B;institut;Ville Beta;;;",
      "institut test b;;ville beta;;;",
      ";spa;Ville Gamma;;;",
      "Spa Test C;spa;Ville Gamma;12345;;",
      "Spa Test D;spa;Ville Gamma;;pas-un-email;",
      "Spa Test E;spa;Ville Gamma;;;javascript:alert(1)",
      "Onglerie Test F;inconnue;Ville Delta;n/a;-;",
    ].join("\n");
    const plan = planCsvImport(csv);

    expect(plan.rows.map((r) => r.name)).toEqual(["Salon Test A", "Institut Test B", "Onglerie Test F"]);
    const [a, b, f] = plan.rows;
    expect(a).toMatchObject({
      line: 2,
      sourceRef: "phone:+212600000001",
      category: "hairdresser",
      city: "Ville Alpha",
      phone: "+212600000001",
      email: "contact@salon-test-a.example",
      website: "https://www.salon-test-a.example/",
    });
    expect(b).toMatchObject({ sourceRef: nameCityRef("Institut Test B", "Ville Beta"), category: "beauty", phone: null });
    expect(f).toMatchObject({ category: "other", phone: null, email: null });
    expect(b.sourceRef.length).toBeLessThanOrEqual(64);

    expect(plan.skipped).toBe(6);
    expect(plan.errors).toEqual([
      { line: 3, error: "Doublon de la ligne 2." },
      { line: 5, error: "Doublon de la ligne 4." },
      { line: 6, error: "Nom manquant." },
      { line: 7, error: "Téléphone marocain invalide." },
      { line: 8, error: "E-mail invalide." },
      { line: 9, error: "Site web invalide (http ou https uniquement)." },
    ]);
  });

  it("accepte la virgule et les guillemets, et refuse un fichier sans colonne nom", () => {
    const plan = planCsvImport('name,city,phone\n"Salon, Test G","Ville Epsilon","0700000007"\n');
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({ name: "Salon, Test G", city: "Ville Epsilon", phone: "+212700000007" });
    expect(() => planCsvImport("ville;telephone\nVille A;0600000001\n")).toThrow(/nom/);
    expect(() => planCsvImport("")).toThrow(CsvFormatError);
  });
});

describe("export CSV", () => {
  it("préfixe d'une apostrophe les cellules texte commençant par = + - @ tabulation ou retour chariot", () => {
    expect(csvCell("=SOMME(A1:A2)")).toBe("'=SOMME(A1:A2)");
    expect(csvCell("+212600000001")).toBe("'+212600000001");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("\tx")).toBe("'\tx");
    expect(csvCell("\rx")).toBe("\"'\rx\"");
    expect(csvCell("Salon; Test")).toBe('"Salon; Test"');
    expect(csvCell('Dit "test"')).toBe('"Dit ""test"""');
    expect(csvCell(-7.61)).toBe("-7.61");
    expect(csvCell(null)).toBe("");
  });

  it("écrit un BOM UTF-8, l'en-tête relu par l'import, et fait l'aller-retour", () => {
    const item: ProspectDto = {
      id: "prsp_test", source: "MANUAL", sourceRef: null, name: "=Salon Test H", category: "nails",
      city: "Ville Zeta", address: "1 rue Test", latitude: 30.5, longitude: -9.5, phone: "+212600000008",
      email: "h@salon-test.example", website: "https://salon-test.example/", status: "CONTACTED",
      notes: "Rappeler\nlundi", lastSyncedAt: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const csv = prospectsToCsv([item]);
    expect(csv.startsWith("﻿nom;categorie;ville;adresse;telephone;email;site;statut;notes;")).toBe(true);
    expect(csv).toContain("'=Salon Test H;nails;Ville Zeta;1 rue Test;'+212600000008;");
    expect(csv).toContain('"Rappeler\nlundi"');
    expect(csv).toContain(";30.5;-9.5;");

    const plan = planCsvImport(csv);
    expect(plan.errors).toEqual([]);
    expect(plan.rows[0]).toMatchObject({ name: "=Salon Test H", phone: "+212600000008", category: "nails", city: "Ville Zeta" });
  });
});
