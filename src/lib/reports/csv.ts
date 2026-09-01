function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(values: unknown[]): string {
  return values.map(escapeCsv).join(";");
}

export function financeToCsv(data: {
  meta: { organizationName: string; periodFrom: string; periodTo: string };
  overview: { revenue: { value: number }; expenses: { value: number }; margin: { value: number }; averageTicket: { value: number } };
  revenue: { byPaymentMethod: { label: string; amount: number; count: number }[] };
  refunds: { count: number; amount: number };
}): string {
  const lines: string[] = [
    row(["Rapport financier", data.meta.organizationName]),
    row(["Période", `${data.meta.periodFrom} → ${data.meta.periodTo}`]),
    "",
    row(["Indicateur", "Valeur (MAD)"]),
    row(["CA net", data.overview.revenue.value]),
    row(["Dépenses", data.overview.expenses.value]),
    row(["Marge", data.overview.margin.value]),
    row(["Panier moyen", data.overview.averageTicket.value]),
    "",
    row(["PAIEMENTS"]),
    row(["Méthode", "Montant", "Nombre"]),
    ...data.revenue.byPaymentMethod.map((m) => row([m.label, m.amount, m.count])),
    "",
    row(["REMBOURSEMENTS"]),
    row(["Nombre", data.refunds.count]),
    row(["Montant", data.refunds.amount]),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function staffToCsv(data: {
  meta: { organizationName: string; periodFrom: string; periodTo: string };
  items: { staffName: string; appointments: number; revenue: number; commission: number }[];
}): string {
  const lines = [
    row(["Rapport employées", data.meta.organizationName]),
    row(["Période", `${data.meta.periodFrom} → ${data.meta.periodTo}`]),
    "",
    row(["Employée", "RDV", "CA (MAD)", "Commission (MAD)"]),
    ...data.items.map((s) => row([s.staffName, s.appointments, s.revenue, s.commission])),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function customersToCsv(data: {
  meta: { organizationName: string; periodFrom: string; periodTo: string };
  rows: {
    customerName: string;
    phone: string;
    visits: number;
    netRevenue: number;
    averageTicket: number;
    lastVisitAt: string | null;
    segment: string;
  }[];
}): string {
  const lines = [
    row(["Rapport clientes", data.meta.organizationName]),
    row(["Période", `${data.meta.periodFrom} → ${data.meta.periodTo}`]),
    "",
    row(["Cliente", "Téléphone", "Visites", "CA net", "Panier moyen", "Dernière visite", "Segment"]),
    ...data.rows.map((c) =>
      row([
        c.customerName,
        c.phone,
        c.visits,
        c.netRevenue,
        c.averageTicket,
        c.lastVisitAt ? c.lastVisitAt.slice(0, 10) : "",
        c.segment,
      ]),
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function servicesToCsv(data: {
  meta: { organizationName: string; periodFrom: string; periodTo: string };
  items: {
    serviceName: string;
    appointments: number;
    revenue: number;
    consumableCost: number;
    estimatedMargin: number;
  }[];
}): string {
  const lines = [
    row(["Rapport services", data.meta.organizationName]),
    "",
    row(["Service", "Prestations", "CA", "Coût consommables", "Marge estimée"]),
    ...data.items.map((s) =>
      row([s.serviceName, s.appointments, s.revenue, s.consumableCost, s.estimatedMargin]),
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function inventoryToCsv(data: {
  meta: { organizationName: string; periodFrom: string; periodTo: string };
  ledger: {
    productName: string;
    purchases: number;
    consumption: number;
    sales: number;
    losses: number;
    adjustments: number;
    ledgerBalance: number;
    unit: string;
  }[];
}): string {
  const lines = [
    row(["Rapport stock (ledger)", data.meta.organizationName]),
    "",
    row(["Produit", "Achats", "Consommation", "Ventes", "Pertes", "Ajustements", "Stock théorique", "Unité"]),
    ...data.ledger.map((p) =>
      row([
        p.productName,
        p.purchases,
        p.consumption,
        p.sales,
        p.losses,
        p.adjustments,
        p.ledgerBalance,
        p.unit,
      ]),
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}
