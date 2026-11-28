import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { planCsvImport } from "@/lib/prospects/csv";
import { planTabularImport } from "@/lib/prospects/import-plan";
import { readXlsxRecords } from "@/lib/prospects/xlsx";

/**
 * Ce qu'une liste modifiée dans Google Sheets peut renvoyer : apostrophe conservée, zéro initial perdu,
 * téléphone devenu nombre, cellule en erreur de formule. Données inventées.
 */
async function xlsx(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Feuille 1");
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const HEADER = ["nom", "ville", "telephone"];

describe("valeurs revenant de Google Sheets", () => {
  it("accepte l'apostrophe, le zéro perdu et les téléphones numériques", async () => {
    const plan = planTabularImport(
      await readXlsxRecords(
        await xlsx([
          HEADER,
          ["Salon A", "Rabat", "'+212612345601"],
          ["Salon B", "Rabat", "612345602"],
          ["Salon C", "Rabat", 612345603],
          ["Salon D", "Rabat", 212612345604],
        ]),
      ),
    );
    expect(plan.errors).toEqual([]);
    expect(plan.rows.map((row) => row.phone)).toEqual([
      "+212612345601",
      "+212612345602",
      "+212612345603",
      "+212612345604",
    ]);
  });

  it("signale la ligne quand une cellule est en erreur de formule (.xlsx)", async () => {
    const plan = planTabularImport(
      await readXlsxRecords(
        await xlsx([
          HEADER,
          ["Salon E", "Fès", { formula: "+212 612345605", result: { error: "#ERROR!" } }],
          ["Salon F", "Fès", { error: "#REF!" }],
          ["Salon G", "Fès", "0612345607"],
        ]),
      ),
    );
    expect(plan.rows.map((row) => row.name)).toEqual(["Salon G"]);
    expect(plan.errors.map((error) => error.line)).toEqual([2, 3]);
    expect(plan.errors[0].error).toContain("formule");
  });

  it("signale la même erreur dans un CSV téléchargé depuis Google Sheets", () => {
    const plan = planCsvImport("nom;ville;telephone\nSalon H;Fès;#ERROR!\nSalon I;Fès;'+212612345609\n");
    expect(plan.errors.map((error) => error.line)).toEqual([2]);
    expect(plan.rows.map((row) => row.phone)).toEqual(["+212612345609"]);
  });
});
