import ExcelJS from "exceljs";
import type { FinanceReport } from "@/types/reports";

export async function financeToXlsx(data: FinanceReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rappel Beauté";

  const summary = wb.addWorksheet("Résumé");
  summary.addRow(["Rapport financier", data.meta.organizationName]);
  summary.addRow(["Période", `${data.meta.periodFrom} → ${data.meta.periodTo}`]);
  summary.addRow([]);
  summary.addRow(["CA net", data.overview.revenue.value]);
  summary.addRow(["Dépenses", data.overview.expenses.value]);
  summary.addRow(["Marge", data.overview.margin.value]);
  summary.addRow(["Panier moyen", data.overview.averageTicket.value]);

  const payments = wb.addWorksheet("Paiements");
  payments.addRow(["Méthode", "Montant (MAD)", "Nombre"]);
  for (const m of data.revenue.byPaymentMethod) {
    payments.addRow([m.label, m.amount, m.count]);
  }

  const refunds = wb.addWorksheet("Remboursements");
  refunds.addRow(["Nombre", data.refunds.count]);
  refunds.addRow(["Montant (MAD)", data.refunds.amount]);

  const margin = wb.addWorksheet("Marge");
  margin.addRow(["CA net", data.overview.revenue.value]);
  margin.addRow(["Dépenses", data.overview.expenses.value]);
  margin.addRow(["Marge", data.overview.margin.value]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function genericToXlsx(
  title: string,
  headers: string[],
  rows: unknown[][],
  meta: { organizationName: string; periodFrom: string; periodTo: string },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rapport");
  ws.addRow([title, meta.organizationName]);
  ws.addRow(["Période", `${meta.periodFrom} → ${meta.periodTo}`]);
  ws.addRow([]);
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
