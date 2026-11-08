import { soinLabelsFromNotes } from "@/components/agenda/service-notes";
import {
  isPosPayment,
  isUnpaidDue,
  paymentServiceLabels,
  type GroupedPaymentItem,
} from "@/components/finance/payment-helpers";
import { listPosSalesApi } from "@/modules/pos/service";
import type { Appointment } from "@/types/appointment";
import type { PaymentItem } from "@/types/finance";
import type { PosSaleDetail } from "@/types/pos";

export type PaymentServiceLine = {
  name: string;
  price: number | null;
};

export type PaymentSoldProductLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PaymentUsedProductLine = {
  name: string;
  quantity: number;
};

export type PaymentBreakdown = {
  services: PaymentServiceLine[];
  soldProducts: PaymentSoldProductLine[];
  usedProducts: PaymentUsedProductLine[];
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function uniqueSales(sales: PosSaleDetail[]): PosSaleDetail[] {
  const seen = new Set<string>();
  return sales.filter((sale) => {
    if (seen.has(sale.id)) return false;
    seen.add(sale.id);
    return true;
  });
}

async function loadAppointment(appointmentId: string): Promise<Appointment | null> {
  try {
    const res = await fetch(`/api/appointments/${appointmentId}/`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Appointment;
  } catch {
    return null;
  }
}

async function loadServiceCatalog(): Promise<{ id: string; name: string; price: number }[]> {
  try {
    const res = await fetch("/api/services/?agenda=1", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    return list.map((service: { id: string; name: string; price?: number }) => ({
      id: service.id,
      name: service.name,
      price: Number(service.price) || 0,
    }));
  } catch {
    return [];
  }
}

/** Prestations uniquement — jamais les noms de produits vendus. */
function resolveServiceLines(
  payment: PaymentItem,
  appointment: Appointment | null,
  catalog: { id: string; name: string; price: number }[],
  soldProductNames: Set<string>,
): PaymentServiceLine[] {
  if (isPosPayment(payment) && !payment.appointmentId && !appointment) {
    return [];
  }

  const catalogByName = new Map(catalog.map((service) => [clean(service.name), service]));

  const fromNotes = soinLabelsFromNotes(appointment?.notes).filter(
    (name) => !soldProductNames.has(clean(name)),
  );

  let names: string[] = [];
  if (fromNotes.length > 0) {
    names = fromNotes;
  } else if (appointment?.serviceName?.trim()) {
    names = [appointment.serviceName.trim()];
  } else {
    // Ne garder que les libellés qui existent dans le catalogue services
    names = paymentServiceLabels(payment.serviceName).filter((name) => {
      const key = clean(name);
      if (!key || key.includes("vente produit")) return false;
      if (soldProductNames.has(key)) return false;
      return catalogByName.has(key);
    });
  }

  names = names.filter((name) => !soldProductNames.has(clean(name)));

  if (names.length > 0) {
    return names.map((name) => {
      const match = catalogByName.get(clean(name));
      return {
        name,
        price:
          match?.price ??
          (appointment && clean(appointment.serviceName) === clean(name)
            ? appointment.price
            : null),
      };
    });
  }

  if (appointment?.serviceName) {
    const match = catalog.find((service) => service.id === appointment.serviceId);
    return [
      {
        name: appointment.serviceName,
        price: match?.price ?? appointment.price ?? null,
      },
    ];
  }

  return [];
}

async function loadSoldProducts(payment: PaymentItem): Promise<PaymentSoldProductLine[]> {
  const sales: PosSaleDetail[] = [];
  const grouped = payment as GroupedPaymentItem;

  try {
    if (payment.appointmentId) {
      const byApt = await listPosSalesApi({
        appointmentId: payment.appointmentId,
        status: "COMPLETED",
        limit: 30,
      });
      sales.push(...byApt.data);
    }

    const paymentIds = new Set<string>();
    if (!isUnpaidDue(payment)) {
      paymentIds.add(payment.id);
    }
    for (const id of grouped.groupIds ?? []) {
      if (!id.startsWith("due:")) paymentIds.add(id);
    }

    await Promise.all(
      [...paymentIds].map(async (paymentId) => {
        const byPay = await listPosSalesApi({
          paymentId,
          status: "COMPLETED",
          limit: 10,
        });
        sales.push(...byPay.data);
      }),
    );
  } catch {
    /* ignore */
  }

  const lines: PaymentSoldProductLine[] = [];
  for (const sale of uniqueSales(sales)) {
    for (const line of sale.lines) {
      if (!line.name?.trim()) continue;
      lines.push({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      });
    }
  }
  return lines;
}

export async function fetchPaymentBreakdown(
  payment: PaymentItem,
): Promise<PaymentBreakdown> {
  const appointment = payment.appointmentId
    ? await loadAppointment(payment.appointmentId)
    : null;
  const [catalog, soldProducts] = await Promise.all([
    loadServiceCatalog(),
    loadSoldProducts(payment),
  ]);
  const soldProductNames = new Set(soldProducts.map((line) => clean(line.name)));

  return {
    services: resolveServiceLines(payment, appointment, catalog, soldProductNames),
    soldProducts,
    usedProducts: [],
  };
}

export function breakdownToTicketLines(breakdown: PaymentBreakdown): {
  name: string;
  price: number;
  quantity?: number;
  detail?: string;
}[] {
  const lines: {
    name: string;
    price: number;
    quantity?: number;
    detail?: string;
  }[] = [];

  for (const service of breakdown.services) {
    lines.push({
      name: service.name,
      price: service.price ?? 0,
      detail: "Prestation",
    });
  }

  for (const product of breakdown.soldProducts) {
    lines.push({
      name: product.name,
      // prix unitaire : le ticket multiplie déjà par quantity
      price: product.unitPrice,
      quantity: product.quantity,
      detail: "Produit vendu",
    });
  }

  return lines;
}
