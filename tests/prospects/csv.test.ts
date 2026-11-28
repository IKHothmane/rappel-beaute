import { describe, expect, it } from "vitest";
import { csvCell, decodeCsvBytes, detectSeparator, parseCsv, planCsvImport, prospectsToCsv } from "@/lib/prospects/csv";
import { ImportFormatError, mapImportHeaders, nameCityRef } from "@/lib/prospects/import-plan";
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
    expect(() => parseCsv('nom\n"Salon A\n')).toThrow(ImportFormatError);
  });

  it("décode l'UTF-8 et, à défaut, le Windows-1252 d'Excel", () => {
    expect(decodeCsvBytes(new TextEncoder().encode("nom\nCafé Test"))).toBe("nom\nCafé Test");
    expect(decodeCsvBytes(Uint8Array.from([0x6e, 0x6f, 0x6d, 0x0a, 0x43, 0x61, 0x66, 0xe9]))).toBe("nom\nCafé");
  });

  it("reconnaît les en-têtes français et anglais sans tenir compte de la casse ni des accents", () => {
    expect(mapImportHeaders(["ID", "NOM", "Catégorie", "Ville", "Adresse", "Téléphone", "E-mail", "Site web", "Statut", "Notes"])).toEqual({
      id: 0, name: 1, category: 2, city: 3, address: 4, phone: 5, email: 6, website: 7, status: 8, notes: 9,
    });
    expect(mapImportHeaders(["name", "category", "city", "address", "tel", "email", "website", "status"])).toEqual({
      name: 0, category: 1, city: 2, address: 3, phone: 4, email: 5, website: 6, status: 7,
    });
  });
});

describe("plan d'import CSV", () => {
  it("normalise, dédoublonne par téléphone puis par nom + ville, et liste les lignes ignorées", () => {
    const csv = [
      "Nom;Catégorie;Ville;Téléphone;Email;Site;Statut",
      "Salon Test A;coiffeur;VILLE ALPHA;06 00 00 00 01;contact@salon-test-a.example;www.salon-test-a.example;Contacté",
      "Salon Test A bis;barbier;Ville Alpha;+212600000001;;;",
      "Institut Test B;institut;Ville Beta;;;;",
      "institut test b;;ville beta;;;;",
      ";spa;Ville Gamma;;;;",
      "Spa Test C;spa;Ville Gamma;12345;;;",
      "Spa Test D;spa;Ville Gamma;;pas-un-email;;",
      "Spa Test E;spa;Ville Gamma;;;javascript:alert(1);",
      "Onglerie Test F;inconnue;Ville Delta;n/a;-;;",
      "Spa Test G;spa;Ville Gamma;;;;Gagné",
    ].join("\n");
    const plan = planCsvImport(csv);

    expect(plan.rows.map((r) => r.name)).toEqual(["Salon Test A", "Institut Test B", "Onglerie Test F"]);
    const [a, b, f] = plan.rows;
    expect(a).toMatchObject({
      line: 2,
      id: null,
      sourceRef: "phone:+212600000001",
      category: "hairdresser",
      city: "Ville Alpha",
      phone: "+212600000001",
      email: "contact@salon-test-a.example",
      website: "https://www.salon-test-a.example/",
      status: "CONTACTED",
      notes: null,
    });
    expect(b).toMatchObject({ sourceRef: nameCityRef("Institut Test B", "Ville Beta"), category: "beauty", phone: null, status: null });
    expect(f).toMatchObject({ category: null, phone: null, email: null });
    expect((b.sourceRef as string).length).toBeLessThanOrEqual(64);

    expect(plan.skipped).toBe(7);
    expect(plan.errors).toEqual([
      { line: 3, error: "Doublon de la ligne 2." },
      { line: 5, error: "Doublon de la ligne 4." },
      { line: 6, error: "Nom manquant." },
      { line: 7, error: "Téléphone marocain invalide." },
      { line: 8, error: "E-mail invalide." },
      { line: 9, error: "Site web invalide (http ou https uniquement)." },
      { line: 11, error: "Statut inconnu (À contacter, Contacté, Client ou Refus)." },
    ]);
  });

  it("colonne id : ligne sans nom admise (mise à jour), id mal formé traité comme absent, doublon d'id refusé", () => {
    const plan = planCsvImport(
      ["id;nom;statut;notes", "prsp_aaaaaa;;Client;Rappeler", "prsp_aaaaaa;Salon Test H;;", "pas un id !;Salon Test I;REFUS;", "pas un id !;;;"].join("\n"),
    );
    expect(plan.rows).toEqual([
      expect.objectContaining({ line: 2, id: "prsp_aaaaaa", name: null, sourceRef: null, status: "CUSTOMER", notes: "Rappeler" }),
      expect.objectContaining({ line: 4, id: null, name: "Salon Test I", status: "DECLINED" }),
    ]);
    expect(plan.errors).toEqual([
      { line: 3, error: "Doublon de la ligne 2." },
      { line: 5, error: "Nom manquant." },
    ]);
  });

  it("accepte la virgule et les guillemets, et refuse un fichier sans colonne nom ni id", () => {
    const plan = planCsvImport('name,city,phone\n"Salon, Test G","Ville Epsilon","0700000007"\n');
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({ name: "Salon, Test G", city: "Ville Epsilon", phone: "+212700000007" });
    expect(() => planCsvImport("ville;telephone\nVille A;0600000001\n")).toThrow(/nom/);
    expect(() => planCsvImport("")).toThrow(ImportFormatError);
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

  it("écrit un BOM UTF-8, id / statut en français / notes, et fait l'aller-retour", () => {
    const item: ProspectDto = {
      id: "prsp_test", source: "MANUAL", sourceRef: null, name: "=Salon Test H", category: "nails",
      city: "Ville Zeta", address: "1 rue Test", latitude: 30.5, longitude: -9.5, phone: "+212600000008",
      email: "h@salon-test.example", website: "https://salon-test.example/", status: "CONTACTED",
      notes: "Rappeler\nlundi", lastSyncedAt: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const csv = prospectsToCsv([item]);
    expect(csv.startsWith("﻿id;nom;categorie;ville;adresse;telephone;email;site;statut;notes;source;latitude;longitude;mis_a_jour\r\n")).toBe(true);
    expect(csv).toContain("prsp_test;'=Salon Test H;nails;Ville Zeta;1 rue Test;'+212600000008;");
    expect(csv).toContain(';Contacté;"Rappeler\nlundi";MANUAL;30.5;-9.5;');

    const plan = planCsvImport(csv);
    expect(plan.errors).toEqual([]);
    expect(plan.rows[0]).toMatchObject({
      id: "prsp_test", name: "=Salon Test H", phone: "+212600000008", category: "nails", city: "Ville Zeta",
      status: "CONTACTED", notes: "Rappeler\nlundi",
    });
  });
});
