import PDFDocument from "pdfkit";
import type { FinanceReport } from "@/types/reports";

function collectPdf(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function financeToPdf(data: FinanceReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const bufPromise = collectPdf(doc);

  doc.fontSize(18).text(data.meta.organizationName, { align: "center" });
  doc.fontSize(14).text("Rapport financier", { align: "center" });
  doc
    .fontSize(10)
    .text(`${data.meta.periodFrom} → ${data.meta.periodTo}`, { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text("Résumé", { underline: true });
  doc.fontSize(10);
  doc.text(`CA net       ${data.overview.revenue.value.toLocaleString("fr-MA")} MAD`);
  doc.text(`Dépenses     ${data.overview.expenses.value.toLocaleString("fr-MA")} MAD`);
  doc.text(`Marge        ${data.overview.margin.value.toLocaleString("fr-MA")} MAD`);
  doc.text(`Panier moyen ${data.overview.averageTicket.value.toLocaleString("fr-MA")} MAD`);
  doc.moveDown();

  doc.fontSize(12).text("Paiements", { underline: true });
  doc.fontSize(10);
  for (const m of data.revenue.byPaymentMethod) {
    doc.text(`${m.label.padEnd(14)} ${m.amount.toLocaleString("fr-MA")} MAD (${m.count})`);
  }
  doc.moveDown();

  doc.fontSize(12).text("Remboursements", { underline: true });
  doc.fontSize(10);
  doc.text(`Nombre  ${data.refunds.count}`);
  doc.text(`Montant ${data.refunds.amount.toLocaleString("fr-MA")} MAD`);

  doc.end();
  return bufPromise;
}

export async function genericToPdf(
  title: string,
  meta: { organizationName: string; periodFrom: string; periodTo: string },
  sections: { heading: string; lines: string[] }[],
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const bufPromise = collectPdf(doc);

  doc.fontSize(16).text(meta.organizationName, { align: "center" });
  doc.fontSize(13).text(title, { align: "center" });
  doc.fontSize(9).text(`${meta.periodFrom} → ${meta.periodTo}`, { align: "center" });
  doc.moveDown();

  for (const sec of sections) {
    doc.fontSize(11).text(sec.heading, { underline: true });
    doc.fontSize(9);
    for (const line of sec.lines) doc.text(line);
    doc.moveDown(0.5);
  }

  doc.end();
  return bufPromise;
}
