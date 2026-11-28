import { deflateRawSync, inflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EXPORT_COLUMNS } from "@/lib/prospects/csv";
import { decodeImportFile, ImportFormatError, planTabularImport } from "@/lib/prospects/import-plan";
import type { ProspectDto } from "@/lib/prospects/types";
import { inspectXlsxArchive, prospectsToXlsx, readXlsxRecords, readZipDirectory } from "@/lib/prospects/xlsx";

/** Archive zip construite à la main (tailles déclarées libres) pour les fichiers piégés. */
type FakeEntry = { name: string; content: Buffer; method?: 0 | 8; declaredSize?: number; flags?: number };
function buildZip(entries: FakeEntry[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const method = entry.method ?? 8;
    const data = method === 8 ? deflateRawSync(entry.content) : entry.content;
    const name = Buffer.from(entry.name);
    const size = entry.declaredSize ?? entry.content.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.flags ?? 0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    parts.push(local, name, data);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(entry.flags ?? 0, 8);
    record.writeUInt16LE(method, 10);
    record.writeUInt32LE(data.length, 20);
    record.writeUInt32LE(size, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += 30 + name.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

const BASE: FakeEntry[] = [
  { name: "[Content_Types].xml", content: Buffer.from("<Types/>") },
  { name: "xl/workbook.xml", content: Buffer.from("<workbook/>") },
];

function zipEntryText(archive: Buffer, name: string): string {
  const entry = readZipDirectory(archive).find((e) => e.name === name);
  if (!entry) throw new Error(`entrée absente : ${name}`);
  const at = entry.localOffset;
  const start = at + 30 + archive.readUInt16LE(at + 26) + archive.readUInt16LE(at + 28);
  const data = archive.subarray(start, start + entry.compressedSize);
  return (entry.method === 8 ? inflateRawSync(data) : data).toString("utf8");
}

async function expectFormatError(run: () => unknown, status: number) {
  const error = await Promise.resolve().then(run).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ImportFormatError);
  expect((error as ImportFormatError).status).toBe(status);
}

const ITEM: ProspectDto = {
  id: "prsp_xlsx01", source: "OSM", sourceRef: "node/1", name: "=Salon Test H", category: "nails",
  city: "Ville Zeta", address: "1 rue Test", latitude: 30.5, longitude: -9.5, phone: "+212600000008",
  email: "h@salon-test.example", website: "https://salon-test.example/", status: "CONTACTED",
  notes: "Rappeler\nlundi", lastSyncedAt: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
};
const SPARSE: ProspectDto = { ...ITEM, id: "prsp_xlsx02", name: "@Spa Test", category: "spa", city: null, address: null, phone: null, email: null, website: null, status: "TO_CONTACT", notes: null, source: "MANUAL", sourceRef: null };

describe("export .xlsx", () => {
  it("écrit du texte seulement (aucune formule), en-tête gras et figé, colonnes larges", async () => {
    const file = await prospectsToXlsx([ITEM, SPARSE]);
    expect(file.subarray(0, 2).toString()).toBe("PK");
    const sheetXml = zipEntryText(file, "xl/worksheets/sheet1.xml");
    expect(sheetXml).not.toMatch(/<f[ >]/);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet.name).toBe("Prospects");
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet.getRow(1).values).toEqual([undefined, ...EXPORT_COLUMNS]);
    expect(sheet.getCell("A1").font?.bold).toBe(true);
    expect(sheet.getColumn(2).width).toBeGreaterThanOrEqual(20);
    expect(sheet.getCell("B2").type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell("B2").value).toBe("=Salon Test H");
    expect(sheet.getCell("F2").value).toBe("+212600000008");
    expect(sheet.getCell("I2").value).toBe("Contacté");
    expect(sheet.getCell("I3").value).toBe("À contacter");
  });

  it("aller-retour export → import sans perte (id, téléphone intact, statut, notes multilignes)", async () => {
    const plan = planTabularImport(await readXlsxRecords(await prospectsToXlsx([ITEM, SPARSE])));
    expect(plan.errors).toEqual([]);
    expect(plan.rows).toEqual([
      expect.objectContaining({
        id: "prsp_xlsx01", name: "=Salon Test H", category: "nails", city: "Ville Zeta", address: "1 rue Test",
        phone: "+212600000008", email: "h@salon-test.example", website: "https://salon-test.example/",
        status: "CONTACTED", notes: "Rappeler\nlundi",
      }),
      expect.objectContaining({ id: "prsp_xlsx02", name: "@Spa Test", category: "spa", phone: null, status: "TO_CONTACT", notes: null }),
    ]);
  });
});

describe("lecture .xlsx", () => {
  it("prend le résultat en cache d'une formule (jamais évaluée), le texte riche, les liens, les nombres ; première feuille seulement", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Feuille 1");
    sheet.addRow(["nom", "telephone", "ville", "notes"]);
    sheet.addRow([{ formula: 'CONCATENATE("Salon ","Formule")', result: "Salon Formule" }, 600000001, { formula: "1+1" }, new Date(Date.UTC(2026, 0, 15))]);
    sheet.addRow([{ richText: [{ text: "Salon " }, { text: "Riche" }] }, { text: "06 00 00 00 03", hyperlink: "tel:0600000003" }, "Ville Test", true]);
    workbook.addWorksheet("Feuille 2").addRow(["nom", "Ne pas lire"]);
    const records = await readXlsxRecords(Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(records).toEqual([
      { line: 1, cells: ["nom", "telephone", "ville", "notes"] },
      { line: 2, cells: ["Salon Formule", "600000001", "", "2026-01-15"] },
      { line: 3, cells: ["Salon Riche", "06 00 00 00 03", "Ville Test", "TRUE"] },
    ]);
    const plan = planTabularImport(records);
    expect(plan.rows.map((row) => [row.name, row.phone])).toEqual([
      ["Salon Formule", "+212600000001"],
      ["Salon Riche", "+212600000003"],
    ]);
  });

  it("refuse plus de 5000 lignes de données", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Feuille 1");
    sheet.addRow(["nom"]);
    for (let i = 0; i < 5001; i += 1) sheet.addRow([`Salon Test ${i}`]);
    await expectFormatError(async () => readXlsxRecords(Buffer.from(await workbook.xlsx.writeBuffer())), 400);
  });

  it("refuse les archives piégées avant exceljs", async () => {
    const bomb = Buffer.alloc(30 * 1024 * 1024, 0x20);
    // Taille déclarée honnête : refus au répertoire central, sans rien décompresser.
    await expectFormatError(() => inspectXlsxArchive(buildZip([...BASE, { name: "xl/worksheets/sheet1.xml", content: bomb }])), 413);
    // Taille déclarée mensongère (10 Ko) : la décompression réelle est plafonnée.
    await expectFormatError(
      () => inspectXlsxArchive(buildZip([...BASE, { name: "xl/worksheets/sheet1.xml", content: bomb, declaredSize: 10_000 }])),
      413,
    );
    // Ratio anormal sous la limite absolue (5 Mo d'espaces → quelques Ko).
    await expectFormatError(
      () => inspectXlsxArchive(buildZip([...BASE, { name: "xl/worksheets/sheet1.xml", content: Buffer.alloc(5 * 1024 * 1024, 0x20) }])),
      413,
    );
    // Trop d'entrées.
    const many = Array.from({ length: 600 }, (_, i) => ({ name: `xl/media/f${i}.bin`, content: Buffer.from("x"), method: 0 as const }));
    await expectFormatError(() => inspectXlsxArchive(buildZip([...BASE, ...many])), 413);
    // Trop de cellules (stockées sans compression : ni la taille ni le ratio ne suffisent à refuser).
    await expectFormatError(
      () => inspectXlsxArchive(buildZip([...BASE, { name: "xl/worksheets/sheet1.xml", content: Buffer.from('<c r="A1"/>'.repeat(120_001)), method: 0 }])),
      413,
    );
    // Taille déclarée différente du contenu, archive chiffrée, pas un zip, pas un classeur.
    await expectFormatError(() => inspectXlsxArchive(buildZip([...BASE, { name: "xl/styles.xml", content: Buffer.from("<a/>"), declaredSize: 99 }])), 400);
    await expectFormatError(() => inspectXlsxArchive(buildZip([...BASE, { name: "xl/s.xml", content: Buffer.from("<a/>"), flags: 1 }])), 400);
    await expectFormatError(() => readXlsxRecords(Buffer.from("nom;ville\nSalon;Ville")), 400);
    await expectFormatError(() => inspectXlsxArchive(buildZip([{ name: "a.txt", content: Buffer.from("a") }])), 400);
  });
});

describe("fichier envoyé en base64", () => {
  it("n'accepte que .xlsx et .csv, un base64 strict et 2 Mo décodés", async () => {
    expect(decodeImportFile("liste.CSV", Buffer.from("nom\nA").toString("base64"))).toMatchObject({ kind: "csv" });
    expect(decodeImportFile("liste.xlsx", `data:application/octet-stream;base64,${Buffer.from("PK").toString("base64")}`)).toMatchObject({ kind: "xlsx" });
    await expectFormatError(() => decodeImportFile("liste.xls", "AAAA"), 400);
    await expectFormatError(() => decodeImportFile("liste.xlsx.exe", "AAAA"), 400);
    await expectFormatError(() => decodeImportFile("liste.csv", "pas du base64 !"), 400);
    await expectFormatError(() => decodeImportFile("liste.csv", ""), 400);
    await expectFormatError(() => decodeImportFile(undefined, "AAAA"), 400);
    await expectFormatError(() => decodeImportFile("liste.csv", "A".repeat(2_796_204)), 413);
  });
});
